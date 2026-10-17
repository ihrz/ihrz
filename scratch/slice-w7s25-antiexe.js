// W7 slice 25 battery: antiExe.ts ilegalFile + config-gate verbatim legs.
const binaryExtensions = ["exe","msi","dmg","apk","ipa","bat","vbs","ps1","cmd","sh","bin","AppImage","deb","pacman","flatpakref","zip","7z","gz","tar","rar","asar"];
function ilegalFile(str){ return binaryExtensions.some((x) => str.includes(`.${x}`)); }
const files = ["payload.exe","a.EXE","x.bat","setup.AppImage","setup.appimage","archive.tar.gz","file.exe.txt","myexe",".exe","","a.png","notes.txt","virus.EXE","run.sh","lib.asar","doc.7z","a.apk","b.png","setup.msi","x.VBS","trailing.","noext","EVIL.EXE.exe"];
for (const f of files) console.log(JSON.stringify(f), ilegalFile(f));
function proceeds(config){ return !(!config && config !== "on"); }
const cfgs = [undefined,null,"on","off","",0,1,true,false,"1","0","ON"," on ",{},[],"true"];
for (const c of cfgs) console.log("cfg", typeof c === "undefined" ? "undefined" : JSON.stringify(c), "->", proceeds(c) ? "PROCEED" : "SKIP");
