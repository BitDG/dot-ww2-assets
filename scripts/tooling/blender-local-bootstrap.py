"""Temporary upstream add-on host: explicit main-thread queue pump for background Blender.
No geometry code, no global installation, and no saved user preferences.
"""
import bpy,importlib.util,pathlib,sys,socket,threading,time,json,os,hashlib
root=pathlib.Path(__file__).resolve().parents[2];runtime=root/'.runtime/blender-mcp-2.1.9';addon_path=runtime/'package/blender_mcp/bundled/addon.py'
assert hashlib.sha256(addon_path.read_bytes()).hexdigest()=='eb0facf69781a30e69792532087d8d41c6a14fcd323353250abe7988ee297fa5'
spec=importlib.util.spec_from_file_location('dot_task_blender_mcp',addon_path);addon=importlib.util.module_from_spec(spec);sys.modules[spec.name]=addon;spec.loader.exec_module(addon)
addon.register()
for name in ['polyhaven','sketchfab','polypizza','hyper3d','hunyuan3d','tripo']:setattr(bpy.context.scene,'blendermcp_use_'+name,False)
bpy.context.scene.blendermcp_auto_start_server=False
server=addon.BlenderMCPServer(host='127.0.0.1',port=19876)
# Upstream start() is GUI-only because background Blender does not service timers.
# This adapter owns a bounded background lifetime and drains the upstream queue on the main thread.
server.socket=socket.socket(socket.AF_INET,socket.SOCK_STREAM);server.socket.setsockopt(socket.SOL_SOCKET,socket.SO_REUSEADDR,1);server.socket.bind(('127.0.0.1',19876));server.socket.listen(5);server.running=True
server.server_thread=threading.Thread(target=server._server_loop,daemon=True);server.server_thread.start()
(runtime/'ready.json').write_text(json.dumps({'blender':bpy.app.version_string,'addon':addon.bl_info['version'],'protocol':addon.ADDON_PROTOCOL_VERSION,'listen':server.socket.getsockname(),'pid':os.getpid(),'mode':'explicit main-thread upstream queue pump','background':bpy.app.background,'telemetryConsent':server.get_telemetry_consent(),'integrations':{x:getattr(bpy.context.scene,'blendermcp_use_'+x) for x in ['polyhaven','sketchfab','polypizza','hyper3d','hunyuan3d','tripo']}}))
try:
 end=time.monotonic()+180
 while time.monotonic()<end and not (runtime/'stop').exists():server._drain_command_queue();time.sleep(.01)
finally:
 server.stop();addon.unregister()
