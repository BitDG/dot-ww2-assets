"""Restore the approved pinned package locally; no global installation or configuration."""
import pathlib,urllib.request,hashlib,zipfile
root=pathlib.Path(__file__).resolve().parents[2];dest=root/'.runtime/blender-mcp-2.1.9';dest.mkdir(parents=True,exist_ok=True)
wheel=dest/'package.whl';expected='a5cbc6cf316fa7433566eb505a0c26ca22e28c10083bd1b09a23d9e357821ccc'
if not wheel.exists():
 url='https://files.pythonhosted.org/packages/e1/0b/53f520a143bd7b4cbb64d5311d29c8b51bab365bbbfd438a934006dc93a3/mcp_for_blender-2.1.9-py3-none-any.whl'
 data=urllib.request.urlopen(url,timeout=30).read();assert hashlib.sha256(data).hexdigest()==expected;wheel.write_bytes(data)
assert hashlib.sha256(wheel.read_bytes()).hexdigest()==expected
with zipfile.ZipFile(wheel) as z:
 for n in z.namelist():assert not n.startswith('/') and '..' not in pathlib.PurePosixPath(n).parts
 z.extractall(dest/'package')
assert hashlib.sha256((dest/'package/blender_mcp/bundled/addon.py').read_bytes()).hexdigest()=='eb0facf69781a30e69792532087d8d41c6a14fcd323353250abe7988ee297fa5'
print('Pinned MCP source restored locally; no process started. Run verify-blender-mcp.py for bounded diagnostics.')
