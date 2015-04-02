'use strict';
/**
 * thinkjs toolkit
 */

var fs = require('fs');
var path = require('path');
var util = require('util');
var crypto = require('crypto');
var net = require('net');

var toString = Object.prototype.toString;
var isArray = Array.isArray;
var isBuffer = Buffer.isBuffer;
var numberReg = /^((\-?\d*\.?\d*(?:e[+-]?\d*(?:\d?\.?|\.?\d?)\d*)?)|(0[0-7]+)|(0x[0-9a-f]+))$/i

if (!global.Promise) {
  global.Promise = require('es6-promise').Promise;
}

//Promise defer
if (!Promise.defer) {
  Promise.defer = function(){
    var deferred = {};
    deferred.promise = new Promise(function(resolve, reject){
      deferred.resolve = resolve;
      deferred.reject = reject;
    });
    return deferred;
  }
}

/**
 * create Class in javascript
 * @param {Function} superCtor [super constructor]
 * @param {Object} props     []
 */
function Class(superCtor, props){
  var cls = function () {
    function T(args) {
      //copy prototpe data to this
      cls.extend(cls.prototype, this);
      //auto run init method
      if(isFunction(this.init)){
        //get init method return value
        this.__initReturn = this.init.apply(this, args);
      }
      return this;
    }
    T.prototype = cls.prototype;
    T.constructor = cls;
    return new T(arguments);
  };
  cls.extend = function(props, target){
    target = target || cls.prototype;
    var name, value;
    for(name in props){
      value = props[name];
      if (isArray(value)) {
        target[name] = extend([], value);
      }else if(isObject(value)){
        target[name] = extend({}, value);
      }else{
        target[name] = value;
      }
    }
    return cls;
  }
  cls.inherits = function(superCtor){
    cls.super_ = superCtor;
    extend(cls.prototype, superCtor.prototype);
    return cls;
  }
  if (!isFunction(superCtor)) {
    props = superCtor;
  }else if (isFunction(superCtor)) {
    cls.inherits(superCtor);
  }
  if (props) {
    cls.extend(props);
  }
  /**
   * invoke super class method
   * @param  {String} name []
   * @param  {mixed} data []
   * @return {mixed}      []
   */
  cls.prototype.super = function(name, data){
    if (!this[name]) {
      this.super_c = null;
      return;
    }
    var super_ = this.super_c ? this.super_c.super_ : this.constructor.super_;
    if (!super_ || !isFunction(super_.prototype[name])) {
      this.super_c = null;
      return;
    }
    while(this[name] === super_.prototype[name] && super_.super_){
      super_ = super_.super_;
    }
    this.super_c = super_;
    if (!this.super_t) {
      this.super_t = 1;
    }
    if (!isArray(data)) {
      data = arguments.length === 1 ? [] : [data];
    }
    var t = ++this.super_t, ret, method = super_.prototype[name];
    switch(data.length){
      case 0:
        ret = method.call(this);
        break;
      case 1:
        ret = method.call(this, data[0]);
        break;
      case 2:
        ret = method.call(this, data[0], data[1]);
        break;
      default:
        ret = method.apply(this, data);
    }
    if (t === this.super_t) {
      this.super_c = null;
      this.super_t = 0;
    }
    return ret;
  };
  return cls;
}
/**
 * extend object
 * @return {Object} []
 */
function extend(){
  var args = [].slice.call(arguments), deep = true, target = args.shift();
  if (isBoolean(target)) {
    deep = target;
    target = args.shift();
  }
  target = target || {};
  var i = 0, length = args.length, options, name, src, copy, clone;
  for(; i < length; i++){
    options = args[i];
    if (!options) {
      continue;
    }
    for(name in options){
      src = target[name];
      copy = options[name];
      if (src && src === copy) {
        continue;
      }
      if (deep && (isObject(copy) || isArray(copy))) {
        if (isArray(copy)) {
          clone = [];
        }else{
          clone = src && isObject(src) ? src : {}; 
        }
        target[name] = extend(deep, clone, copy);
      }else{
        target[name] = copy;
      }
    }
  }
  return target;
}
/**
 * check object is boolean
 * @param  {mixed}  obj []
 * @return {Boolean}     []
 */
function isBoolean(obj){
  return toString.call(obj) === '[object Boolean]';
}
/**
 * check object is number
 * @param  {mixed}  obj []
 * @return {Boolean}     []
 */
function isNumber(obj){
  return toString.call(obj) === '[object Number]';
}
/**
 * check object is object
 * @param  {mixed}  obj []
 * @return {Boolean}     []
 */
function isObject(obj){
  if (isBuffer(obj)) {
    return false;
  }
  return toString.call(obj) === '[object Object]';
}
/**
 * check object is string
 * @param  {mixed}  obj []
 * @return {Boolean}     []
 */
function isString(obj){
  return toString.call(obj) === '[object String]';
}
/**
 * check object is function
 * @param  {mixed}  obj []
 * @return {Boolean}     []
 */
function isFunction(obj){
  return typeof obj === 'function';
}
/**
 * check path is file
 * @param  {String}  p [filepath]
 * @return {Boolean}   []
 */
function isFile(p){
  if (!fs.existsSync(p)) {
    return false;
  }
  return fs.statSync(p).isFile();
}
/**
 * check path is directory
 * @param  {String}  p []
 * @return {Boolean}   []
 */
function isDir(p){
  if (!fs.existsSync(p)) {
    return false;
  }
  return fs.statSync(p).isDirectory();
}
/**
 * check object is number string
 * @param  {mixed}  obj []
 * @return {Boolean}     []
 */
function isNumberString(obj){
  return numberReg.test(obj);
}
/**
 * check object is promise
 * @param  {mixed}  obj []
 * @return {Boolean}     []
 */
function isPromise(obj){
  return !!(obj && typeof obj.then === 'function' && typeof obj.catch === 'function');
}
/**
 * check path is writable
 * @param  {mixed}  p []
 * @return {Boolean}   []
 */
function isWritable(p){
  if (!fs.existsSync(p)) {
    return false;
  }
  var stats = fs.statSync(p);
  var mode = stats.mode;
  var uid = process.getuid ? process.getuid() : 0;
  var gid = process.getgid ? process.getgid() : 0;
  var owner = uid === stats.uid;
  var group = gid === stats.gid;
  return !!(owner && (mode & parseInt('00200', 8)) || 
      group && (mode & parseInt('00020', 8)) || 
      (mode & parseInt('00002', 8)));
}
/**
 * check object is mepty
 * @param  {[mixed]}  obj []
 * @return {Boolean}     []
 */
function isEmpty(obj){
  if (isObject(obj)) {
    var key;
    for(key in obj){
      return false;
    }
    return true;
  }else if (isArray(obj)) {
    return obj.length === 0;
  }else if (isString(obj)) {
    return obj.length === 0;
  }else if (isNumber(obj)) {
    return obj === 0;
  }else if (obj === null || obj === undefined) {
    return true;
  }else if (isBoolean(obj)) {
    return !obj;
  }
  return false;
}

/**
 * Check if `obj` is a generator.
 *
 * @param {Mixed} obj
 * @return {Boolean}
 */
function isGenerator(obj){
  return obj && 'function' === typeof obj.next && 'function' === typeof obj.throw;
}

/**
 * Check if `obj` is a generator function.
 *
 * @param {Mixed} obj
 * @return {Boolean}
 */
function isGeneratorFunction(obj) {
  if (!obj) {
    return false;
  }
  var constructor = obj.constructor;
  if (!constructor){
    return false;
  }
  if ('GeneratorFunction' === constructor.name || 'GeneratorFunction' === constructor.displayName){
    return true;
  }
  return isGenerator(constructor.prototype);
}

/**
 * make dir recursive
 * @param  {String} p    [path]
 * @param  {mode} mode [path mode]
 * @return {}      []
 */
function mkdir(p, mode){
  mode = mode || '0777';
  if (fs.existsSync(p)) {
    chmod(p, mode);
    return true;
  }
  var pp = path.dirname(p);
  if (fs.existsSync(pp)) {
    fs.mkdirSync(p, mode);
  }else{
    mkdir(pp, mode);
    mkdir(p, mode);
  }
  return true;
}
/**
 * remove dir aync
 * @param  {String} p       [path]
 * @param  {Bollean} reserve []
 * @return {Promise}         []
 */
function rmdir(p, reserve){
  if (!isDir(p)) {
    return Promise.resolve();
  }
  var deferred = Promise.defer();
  fs.readdir(p, function(err, files){
    if (err) {
      return deferred.reject(err);
    }
    var promises = files.map(function(item){
      var filepath = path.normalize(p + '/' + item);
      if (isDir(filepath)) {
        return rmdir(filepath, false);
      }else{
        var deferred = Promise.defer();
        fs.unlink(filepath, function(err){
          return err ? deferred.reject(err) : deferred.resolve();
        })
        return deferred.promise;
      }
    })
    var promise = files.length === 0 ? Promise.resolve() : Promise.all(promises);
    return promise.then(function(){
      if (!reserve) {
        var deferred = Promise.defer();
        fs.rmdir(p, function(err){
          return err ? deferred.reject(err) : deferred.resolve();
        })
        return deferred.promise;
      }
    }).then(function(){
      deferred.resolve();
    }).catch(function(err){
      deferred.reject(err);
    })
  })
  return deferred.promise;
}
/**
 * get files in path
 * @param  {} dir    []
 * @param  {} prefix []
 * @return {}        []
 */
function getFiles(dir, prefix){
  dir = path.normalize(dir);
  if (!fs.existsSync(dir)) {
    return [];
  }
  prefix = prefix || '';
  var files = fs.readdirSync(dir);
  var result = [];
  files.forEach(function(item){
    var stat = fs.statSync(dir + '/' + item);
    if (stat.isFile()) {
      result.push(prefix + item);
    }else if(stat.isDirectory()){
      result = result.concat(getFiles(path.normalize(dir + '/' + item),  path.normalize(prefix + item + '/')));
    }
  })
  return result;
}
/**
 * change path mode
 * @param  {String} p    [path]
 * @param  {String} mode [path mode]
 * @return {Boolean}      []
 */
function chmod(p, mode){
  mode = mode || '0777';
  if (!fs.existsSync(p)) {
    return true;
  }
  return fs.chmodSync(p, mode);
}
/**
 * get content md5
 * @param  {String} str [content]
 * @return {String}     [content md5]
 */
function md5(str){
  var instance = crypto.createHash('md5');
  instance.update(str + '');
  return instance.digest('hex');
}
/**
 * get object by key & value
 * @param  {String} key   []
 * @param  {mixed} value []
 * @return {Object}       []
 */
function getObject(key, value){
  var obj = {};
  if (!isArray(key)) {
    obj[key] = value;
    return obj;
  }
  key.forEach(function(item, i){
    obj[item] = value[i];
  });
  return obj;
}
/**
 * transform array to object
 * @param  {Arrat} arr      []
 * @param  {String} key      []
 * @param  {String} valueKey []
 * @return {mixed}          []
 */
function arrToObj(arr, key, valueKey){
  var result = {}, arrResult = [];
  var i = 0, length = arr.length, item, keyValue;
  for(; i < length; i++){
    item = arr[i];
    keyValue = item[key];
    if (valueKey === null) {
      arrResult.push(keyValue);
    }else if (valueKey) {
      result[keyValue] = item[valueKey];
    }else{
      result[keyValue] = item;
    }
  }
  return valueKey === null ? arrResult : result;
}
/**
 * get object values
 * @param  {Object} obj []
 * @return {Array}     []
 */
function objValues(obj){
  var values = [];
  for(var key in obj){
    if (obj.hasOwnProperty(key)) {
      values.push(obj[key])
    }
  }
  return values;
}


module.exports = {
  Class: Class,
  extend: extend,
  isBoolean: isBoolean,
  isNumber: isNumber,
  isObject: isObject,
  isString: isString,
  isArray: isArray,
  isFunction: isFunction,
  isDate: util.isDate,
  isRegExp: util.isRegExp,
  isError: util.isError,
  isIP: net.isIP,
  isIP4: net.isIP4,
  isIP6: net.isIP6,
  isFile: isFile,
  isDir: isDir,
  isNumberString: isNumberString,
  isPromise: isPromise,
  isWritable: isWritable,
  isBuffer: isBuffer,
  isEmpty: isEmpty,
  isGenerator: isGenerator,
  isGeneratorFunction: isGeneratorFunction,
  mkdir: mkdir,
  rmdir: rmdir,
  md5: md5,
  chmod: chmod,
  getObject: getObject,
  arrToObj: arrToObj,
  getFiles: getFiles,
  objValues: objValues
}