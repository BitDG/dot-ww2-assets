"""Offline, read-only inspection of the approved Playwright Firefox archive. No network or install."""
import argparse,pathlib,hashlib,zipfile,json,configparser,io,stat
p=argparse.ArgumentParser();p.add_argument('archive',type=pathlib.Path);p.add_argument('--sha256',required=True,help='Trusted SHA256 supplied independently by artifact owner/admin; not invented here');a=p.parse_args()
if len(a.sha256)!=64 or any(c not in '0123456789abcdefABCDEF' for c in a.sha256):p.error('Expected 64 hexadecimal SHA256 digits')
b=a.archive.read_bytes();actual=hashlib.sha256(b).hexdigest();assert actual==a.sha256.lower(),'Archive hash mismatch'
with zipfile.ZipFile(io.BytesIO(b)) as z:
 names=z.namelist()
 for n in names:
  assert not n.startswith('/') and '..' not in pathlib.PurePosixPath(n).parts,'Unsafe archive path'
 assert 'firefox/firefox' in names,'Not the expected Firefox bundle'
 assert 'firefox/application.ini' in names,'Missing application identity'
 cfg=configparser.ConfigParser();cfg.read_string(z.read('firefox/application.ini').decode());assert cfg['App']['Version']=='144.0.2','Different browser version'
 elf=z.read('firefox/firefox')[:20];assert elf[:4]==b'\x7fELF' and elf[4]==2 and int.from_bytes(elf[18:20],'little')==62,'Expected Linux x86-64 ELF'
 assert any('libxul.so' in n for n in names),'Incomplete browser libraries'
 result={'status':'hash-and-layout-passed','sha256':actual,'browserVersion':cfg['App']['Version'],'platform':'linux-x86_64','expectedPlaywrightRevision':'1497','revisionAuthenticity':'Requires trusted artifact provenance; version/layout alone do not prove Playwright patches','sourceExpected':'Official Playwright firefox/1497/firefox-debian-13.zip','targetAfterSeparateInstallStep':'.runtime/browsers/firefox-1497/firefox/firefox','networkUsed':False,'installed':False,'executedBrowser':False}
 print(json.dumps(result,indent=2))
