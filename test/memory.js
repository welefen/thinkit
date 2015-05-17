var createClass = require('../index.js').Class;

console.log(process.memoryUsage().heapUsed/(1024*1024))


var index = 0;
setInterval(function(){
  if(index < 20){
    for(var i =0;i<10000;i++){
      var cls = createClass({});
      var instance = cls();
      instance.super();
    }
  }
  
  console.log(process.memoryUsage().heapUsed/(1024*1024))
}, 1000)