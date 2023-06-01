exports.address = function RRA(local) {
    var fs = require('fs');
    var address = fs.readFileSync(__dirname+'/address.txt', 'utf-8');
    var addressArray = address.split('\n');
    var randomNumber = Math.floor(Math.random() * addressArray.length);
    var address = addressArray[randomNumber];
    return address;
};

exports.cc = function RRA(local) {
    var fs = require('fs');
    var address = fs.readFileSync(__dirname+'/ccs.txt', 'utf-8');
    var addressArray = address.split('\n');
    var randomNumber = Math.floor(Math.random() * addressArray.length);
    var address = addressArray[randomNumber];
    return address;
};