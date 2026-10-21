"""Run the bounded Kar98k exterior WIP operations through the real task-local MCP."""
import asyncio,os,sys,pathlib,subprocess,time,json,hashlib,socket
from datetime import timedelta
from mcp import ClientSession,StdioServerParameters
from mcp.client.stdio import stdio_client
root=pathlib.Path(__file__).resolve().parents[2];runtime=root/'.runtime/blender-mcp-2.1.9';out=root/'evidence/kar98k-wip';out.mkdir(parents=True,exist_ok=True);renders=root/'gallery/renders';renders.mkdir(exist_ok=True)
env=os.environ.copy();env.update(PYTHONPATH=str(runtime/'package'),BLENDER_HOST='127.0.0.1',BLENDER_PORT='19876',BLENDER_MCP_SAFE_MODE='1',BLENDER_MCP_DISABLE_TELEMETRY='1',DISABLE_TELEMETRY='1',MCP_DISABLE_TELEMETRY='1')
for script in sys.argv[1:]:
 ident=pathlib.Path(script).stem
 code=(root/script).read_text()
 for n in ['ready.json','stop']:(runtime/n).unlink(missing_ok=True)
 report={'operation':ident,'script':script,'scope':'Task-local original exterior WIP mesh or fixed GLB render via actual MCP'}
 async def run():
  with (out/f'{ident}.mcp.log').open('w') as log:
   async with stdio_client(StdioServerParameters(command=sys.executable,args=['-m','blender_mcp.server'],env=env),errlog=log) as (read,write):
    async with ClientSession(read,write,read_timeout_seconds=timedelta(seconds=170)) as session:
     report['initialize']=(await session.initialize()).model_dump(mode='json')
     status=await session.call_tool('get_addon_status',{});report['addonStatus']=status.model_dump(mode='json');assert not status.isError
     result=await session.call_tool('execute_blender_code',{'code':code});report['toolResult']=result.model_dump(mode='json');text='\n'.join(c.text for c in result.content if c.type=='text');assert not result.isError and text.startswith('Code executed successfully:'),text
 with (out/f'{ident}.blender.log').open('w') as log:
  proc=subprocess.Popen(['/usr/bin/blender','-t','4','--background','--factory-startup','--python',str(root/'scripts/tooling/blender-local-bootstrap.py')],env=env,stdout=log,stderr=subprocess.STDOUT)
  try:
   for _ in range(200):
    if (runtime/'ready.json').exists():break
    if proc.poll() is not None:raise RuntimeError('Blender startup failed')
    time.sleep(.1)
   else:raise TimeoutError('Startup')
   report['runtime']=json.loads((runtime/'ready.json').read_text());assert report['runtime']['listen']==['127.0.0.1',19876] and not any(report['runtime']['integrations'].values())
   asyncio.run(asyncio.wait_for(run(),175));report.update(status='passed')
  except Exception as e:report.update(status='failed',error=repr(e));raise
  finally:
   (runtime/'stop').write_text('stop')
   try:proc.wait(timeout=15)
   except subprocess.TimeoutExpired:proc.terminate();proc.wait(timeout=10)
   report['blenderExitCode']=proc.returncode;s=socket.socket();s.settimeout(1);report['portClosed']=s.connect_ex(('127.0.0.1',19876))!=0;s.close();(out/f'{ident}.json').write_text(json.dumps(report,indent=2))
 print(ident,report['status'],flush=True)
