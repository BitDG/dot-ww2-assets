import asyncio,os,sys,pathlib,subprocess,time,json,hashlib,socket
from mcp import ClientSession,StdioServerParameters
from mcp.client.stdio import stdio_client
root=pathlib.Path(__file__).resolve().parents[2];runtime=root/'.runtime/blender-mcp-2.1.9';out=root/'evidence/tooling';out.mkdir(exist_ok=True)
env=os.environ.copy();env.update(PYTHONPATH=str(runtime/'package'),BLENDER_HOST='127.0.0.1',BLENDER_PORT='19876',BLENDER_MCP_SAFE_MODE='1',BLENDER_MCP_DISABLE_TELEMETRY='1',DISABLE_TELEMETRY='1',MCP_DISABLE_TELEMETRY='1')
for n in ['ready.json','stop']:(runtime/n).unlink(missing_ok=True)
report={'checks':[],'scope':'MCP initialize/list/get_addon_status/get_scene_info only; no modeling','persistentConfigurationChanged':False}
async def probe():
 with (out/'mcp-server.log').open('w') as log:
  params=StdioServerParameters(command=sys.executable,args=['-m','blender_mcp.server'],env=env)
  async with stdio_client(params,errlog=log) as (read,write):
   async with ClientSession(read,write) as session:
    init=await session.initialize();report['initialize']=init.model_dump(mode='json');listed=await session.list_tools();report['tools']=[x.name for x in listed.tools]
    assert 'get_addon_status' in report['tools'] and 'get_scene_info' in report['tools'];report['checks'].append('MCP JSON-RPC initialize and tool discovery passed')
    for name in ['get_addon_status','get_scene_info']:
     r=await session.call_tool(name,{});data=r.model_dump(mode='json');report[name]=data;assert not r.isError
     text='\n'.join(c.text for c in r.content if c.type=='text');assert not text.startswith('Error'),text
     if name=='get_addon_status':assert '4.3.2' in text and '"protocol_version": 13' in text
     else:assert 'Cube' in text,text
     report['checks'].append(name+' returned actual Blender data')
with (out/'blender.log').open('w') as log:
 p=subprocess.Popen(['/usr/bin/blender','--background','--factory-startup','--python',str(root/'scripts/tooling/blender-local-bootstrap.py')],env=env,stdout=log,stderr=subprocess.STDOUT)
 try:
  for _ in range(200):
   if (runtime/'ready.json').exists():break
   if p.poll() is not None:raise RuntimeError('Blender exited; see blender.log')
   time.sleep(.1)
  else:raise TimeoutError('Blender startup timed out')
  report['runtime']=json.loads((runtime/'ready.json').read_text());assert report['runtime']['listen']==['127.0.0.1',19876];assert not any(report['runtime']['integrations'].values());assert report['runtime']['telemetryConsent']=={'consent':False}
  listeners=[line.split()[1] for line in pathlib.Path('/proc/net/tcp').read_text().splitlines()[1:] if line.split()[1].endswith(':4DA4') and line.split()[3]=='0A'];assert listeners==['0100007F:4DA4'],listeners;report['listenAddressVerified']=listeners
  asyncio.run(asyncio.wait_for(probe(),timeout=90));report['status']='passed'
 except Exception as e:report['status']='failed';report['error']=repr(e);raise
 finally:
  (runtime/'stop').write_text('stop');
  try:p.wait(timeout=15)
  except subprocess.TimeoutExpired:p.terminate();p.wait(timeout=10)
  report['blenderExitCode']=p.returncode;s=socket.socket();s.settimeout(1);report['portClosedAfterExit']=s.connect_ex(('127.0.0.1',19876))!=0;s.close();(out/'mcp-verification.json').write_text(json.dumps(report,indent=2))
print(json.dumps({'status':report['status'],'checks':report['checks'],'portClosedAfterExit':report['portClosedAfterExit']}))
