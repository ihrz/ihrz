/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2023 iHorizon
*/

const fs = require('fs');

function load(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (error, data) => {
      if (error) {
        reject(error);
        return;
      };

      try {
        const jsonData = parseYaml(data);
        resolve(jsonData);
      } catch (parseError) {
        reject(parseError);
      };
    });
  });
};

function parseYaml(yamlData) {
  const lines = yamlData.split('\n');
  const jsonData = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith('#')) {
      // Ignore empty lines and comments
      continue;
    };

    const [key, value] = parseLine(trimmedLine);

    if (!key) {
      throw new Error(`Invalid YAML syntax at line ${i + 1}`);
    };

    jsonData[key] = value;
  };

  return jsonData;
};

function parseLine(line) {
  const separatorIndex = line.indexOf(':');
  if (separatorIndex === -1) {
    return [null, null];
  };

  const key = line.slice(0, separatorIndex).trim();
  const value = parseValue(line.slice(separatorIndex + 1).trim());

  return [key, value];
};

function parseValue(value) {
  if (value.startsWith('"') && value.endsWith('"')) {

    var value2 = value.slice(1, -1);
    value2 = value2.toString();
    value2 = value2.replace(/\|n/g, '\n');

    return value2;
  };

  return value.replace(/\\n/g, '\n');
};

module.exports = {
  load
};