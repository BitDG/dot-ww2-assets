"""Launch only from the existing cloud desktop Terminal (DISPLAY=:0)."""
from pathlib import Path
import subprocess,os,time,urllib.request,json
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]
TOOLS=ROOT.parents[1]/'tools'
NODE='/opt/codex/runtimes/codex-primary-runtime/dependencies/node/bin/node'
url='http://127.0.0.1:5198/?generator=dot-model-generator&category=machines&bm13visual=1'
report=HERE/'visual-report.json'
stop=HERE/'stop-qa'
if report.exists(): report.rename(HERE/('visual-report-before-'+str(int(time.time()))+'.json'))
if stop.exists(): stop.unlink()
home=TOOLS/'firefox-isolated-home'
env=os.environ.copy();env.update(HOME=str(home),XDG_CONFIG_HOME=str(home/'config'),XDG_DATA_HOME=str(home/'data'),XDG_CACHE_HOME=str(home/'cache'),LD_LIBRARY_PATH=str(TOOLS/'firefox'))
with (HERE/'vite-browser.log').open('w') as vlog,(HERE/'firefox-browser.log').open('w') as flog:
 server=subprocess.Popen([NODE,str(HERE/'serve-qa.mjs')],cwd=ROOT,stdout=vlog,stderr=subprocess.STDOUT)
 firefox=None
 try:
  for _ in range(120):
   if server.poll() is not None:raise RuntimeError('Vite stopped, inspect vite-browser.log')
   try:
    with urllib.request.urlopen(url,timeout=1) as response:
     if response.status==200:break
   except Exception:time.sleep(.5)
  else:raise RuntimeError('Vite startup timed out')
  firefox=subprocess.Popen([str(TOOLS/'firefox/firefox'),'--no-remote','-P','PGFSmoke',url],stdout=flog,stderr=subprocess.STDOUT,env=env)
  print('BM13 GUI Firefox running at '+url,flush=True)
  for _ in range(2400):
   if report.exists():
    data=json.loads(report.read_text());print('BM13 '+data.get('status','unknown')+' '+str(len(data.get('checks',[])))+' checks',flush=True);break
   if firefox.poll() is not None:raise RuntimeError('Firefox stopped before QA report')
   time.sleep(.5)
  else:raise RuntimeError('QA report timeout')
  while not stop.exists() and firefox.poll() is None:
   time.sleep(.5)
 finally:
  for proc in [firefox,server]:
   if proc is not None and proc.poll() is None:
    proc.terminate()
    try:proc.wait(timeout=20)
    except subprocess.TimeoutExpired:proc.kill();proc.wait()
