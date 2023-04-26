const yaml = require('js-yaml'), fs = require('fs');
//.replace(/\${member\.tag}/g, member.tag)                /\${bonus\s*\|\|\s*0}/g


const getLanguage = require(`${process.cwd()}/files/lang/getLanguage`);

let fileContents = fs.readFileSync(`${process.cwd()}/files/lang/${await getLanguage(interaction.guild.id)}.yml`, 'utf-8');
let data = yaml.load(fileContents);