const yaml = require('js-yaml'), fs = require('fs');
let fileContents = fs.readFileSync(process.cwd()+"/files/lang/en-US.yml", 'utf-8');
let data = yaml.load(fileContents)
//.replace(/\${member\.tag}/g, member.tag)                /\${bonus\s*\|\|\s*0}/g