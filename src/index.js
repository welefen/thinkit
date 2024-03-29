'use strict';

import fs from 'fs';
import path from 'path';
import util from 'util';
import crypto from 'crypto';
import net from 'net';

let {sep} = path;
let toString = Object.prototype.toString;
let isArray = Array.isArray;
let isBuffer = Buffer.isBuffer;
let numberReg = /^((\-?\d*\.?\d*(?:e[+-]?\d*(?:\d?\.?|\.?\d?)\d*)?)|(0[0-7]+)|(0x[0-9a-f]+))$/i;


/**
 * make callback function to promise
 * @param  {Function} fn       []
 * @param  {Object}   receiver []
 * @return {Promise}            []
 */
let promisify = (fn, receiver) => {
  return (...args) => {
    return new Promise((resolve, reject) => {
      fn.apply(receiver, [...args, (err, res) => {
        return err ? reject(err) : resolve(res);
      }]);
    });
  };
};

/**
 * check object is function
 * @param  {Mixed}  obj []
 * @return {Boolean}     []
 */
let isFunction = obj => {
  return typeof obj === 'function';
};

/**
 * is arguments
 * @param  {[type]} obj [description]
 * @return {[type]}     [description]
 */
let isArguments = obj => {
  return toString.call(obj) === '[object Arguments]';
};

/**
 * create Class in javascript
 * @param {Function} superCtor [super constructor]
 * @param {Object} props     []
 */
function Class(superCtor, props){
  let cls = function (...args) {
    if (!(this instanceof cls)) {
      throw new Error('Class constructors cannot be invoked without \'new\'');
    }
    //extend prototype data to instance
    //avoid instance change data to pullte prototype
    cls.extend(cls.__props__, this);
    if(isFunction(this.init)){
      this.__initReturn = this.init(...args);
    }
  };
  cls.__props__ = {};
  cls.extend = function(props, target){
    target = target || cls.prototype;
    let name, value;
    for(name in props){
      value = props[name];
      if (isArray(value)) {
        cls.__props__[name] = target[name] = extend([], value);
      }else if(isObject(value)){
        cls.__props__[name] = target[name] = extend({}, value);
      }else{
        target[name] = value;
      }
    }
    return cls;
  };
  cls.inherits = function(superCtor){
    cls.super_ = superCtor;
    //if superCtor.prototype is not enumerable
    if(Object.keys(superCtor.prototype).length === 0){
      cls.prototype = Object.create(superCtor.prototype, {
        constructor: {
          value: cls,
          enumerable: false,
          writable: true,
          configurable: true
        }
      });
    }else{
      extend(cls.prototype, superCtor.prototype);
    }
    return cls;
  };
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
   * @param  {Mixed} data []
   * @return {Mixed}      []
   */
  cls.prototype.super = function(name, data){
    if (!this[name]) {
      this.super_c = null;
      return;
    }
    let super_ = this.super_c ? this.super_c.super_ : this.constructor.super_;
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
    if (!isArray(data) && !isArguments(data)) {
      data = arguments.length === 1 ? [] : [data];
    }
    let t = ++this.super_t, ret, method = super_.prototype[name];
    ret = method.apply(this, data);
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
let extend = (target, ...args) => {
  target = target || {};
  let i = 0, length = args.length, options, name, src, copy;
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
      if(isObject(copy)){
        target[name] = extend(src && isObject(src) ? src : {}, copy);
      }else if(isArray(copy)){
        target[name] = extend([], copy);
      }else{
        target[name] = copy;
      }
    }
  }
  return target;
};

/**
 * camelCase string
 * @param  {String} str []
 * @return {String}     []
 */
let camelCase = str => {
  if(str.indexOf('_') > -1){
    str = str.replace(/_(\w)/g, (a, b) => {
      return b.toUpperCase();
    });
  }
  return str;
};
/**
 * check object is class
 * @param  {Mixed}  obj []
 * @return {Boolean}     []
 */
let isClass = obj => {
  return isFunction(obj) && isFunction(obj.inherits) && isFunction(obj.extend);
};
/**
 * check object is boolean
 * @param  {Mixed}  obj []
 * @return {Boolean}     []
 */
let isBoolean = obj => {
  return toString.call(obj) === '[object Boolean]';
};
/**
 * check object is number
 * @param  {Mixed}  obj []
 * @return {Boolean}     []
 */
let isNumber = obj => {
  return toString.call(obj) === '[object Number]';
};

/**
 * check object is object
 * @param  {Mixed}  obj []
 * @return {Boolean}     []
 */
let isObject = obj => {
  if (isBuffer(obj)) {
    return false;
  }
  return toString.call(obj) === '[object Object]';
};
/**
 * check object is string
 * @param  {Mixed}  obj []
 * @return {Boolean}     []
 */
let isString = obj => {
  return toString.call(obj) === '[object String]';
};
/**
 * clone data
 * @param  {Mixed} data []
 * @return {Mixed}      []
 */
let clone = data => {
  if (isObject(data)) {
    return extend({}, data);
  }else if (isArray(data)) {
    return extend([], data);
  }
  return data;
};
/**
 * check path is file
 * @param  {String}  p [filepath]
 * @return {Boolean}   []
 */
let isFile = p => {
  try{
    return fs.statSync(p).isFile();
  }catch(e){}
  return false;
};

/**
 * check path is file in async mode
 * @param  {String} p []
 * @return {Boolean}   []
 */
let isFileAsync = p => {
  return promisify(fs.stat, fs)(p).then(stat => {
    return stat.isFile();
  }).catch(() => {
    return false;
  });
};

/**
 * check path is directory
 * @param  {String}  p []
 * @return {Boolean}   []
 */
let isDir = p => {
  try{
    return fs.statSync(p).isDirectory();
  }catch(e){}
  return false;
};

/**
 * check path is file in async mode
 * @param  {String} p []
 * @return {Boolean}   []
 */
let isDirAsync = p => {
  return promisify(fs.stat, fs)(p).then(stat => {
    return stat.isDirectory();
  }).catch(() => {
    return false;
  });
};

/**
 * check object is number string
 * @param  {Mixed}  obj []
 * @return {Boolean}     []
 */
let isNumberString = obj => {
  if(!obj){
    return false;
  }
  return numberReg.test(obj);
};
/**
 * check object is promise
 * @param  {Mixed}  obj []
 * @return {Boolean}     []
 */
let isPromise = obj => {
  return !!(obj && typeof obj.then === 'function' && typeof obj.catch === 'function');
};
/**
 * check path is writable
 * @param  {Mixed}  p []
 * @return {Boolean}   []
 */
let isWritable = p => {
  if (!fs.existsSync(p)) {
    return false;
  }
  let stats = fs.statSync(p);
  let mode = stats.mode;
  let uid = process.getuid ? process.getuid() : 0;
  let gid = process.getgid ? process.getgid() : 0;
  let owner = uid === stats.uid;
  let group = gid === stats.gid;
  return !!(owner && (mode & parseInt('00200', 8)) || 
      group && (mode & parseInt('00020', 8)) || 
      (mode & parseInt('00002', 8)));
};

/**
 * true empty
 * @param  {Mixed} obj []
 * @return {Boolean}     []
 */
let isTrueEmpty = obj => {
  if(obj === undefined || obj === null || obj === ''){
    return true;
  }
  if(isNumber(obj) && isNaN(obj)){
    return true;
  }
  return false;
};
/**
 * check object is mepty
 * @param  {[Mixed]}  obj []
 * @return {Boolean}     []
 */
let isEmpty = obj => {
  if(isTrueEmpty(obj)){
    return true;
  }

  if (isObject(obj)) {
    for(let key in obj){
      return false && key; // only for eslint
    }
    return true;
  }else if (isArray(obj)) {
    return obj.length === 0;
  }else if (isString(obj)) {
    return obj.length === 0;
  }else if (isNumber(obj)) {
    return obj === 0;
  }else if (isBoolean(obj)) {
    return !obj;
  }
  return false;
};


/**
 * make dir recursive
 * @param  {String} p    [path]
 * @param  {mode} mode [path mode]
 * @return {}      []
 */
let mkdir = (p, mode) => {
  mode = mode || '0777';
  if (fs.existsSync(p)) {
    chmod(p, mode);
    return true;
  }
  let pp = path.dirname(p);
  if (fs.existsSync(pp)) {
    fs.mkdirSync(p, mode);
  }else{
    mkdir(pp, mode);
    mkdir(p, mode);
  }
  return true;
};

/**
 * get deferred object
 * @return {Object} []
 */
let defer = () => {
  let deferred = {};
  deferred.promise = new Promise((resolve, reject) => {
    deferred.resolve = resolve;
    deferred.reject = reject;
  });
  return deferred;
};

/**
 * remove dir aync
 * @param  {String} p       [path]
 * @param  {Bollean} reserve []
 * @return {Promise}         []
 */
let rmdir = (p, reserve) => {
  if (!isDir(p)) {
    return Promise.resolve();
  }
  let deferred = defer();
  fs.readdir(p, (err, files) => {
    if (err) {
      return deferred.reject(err);
    }
    let promises = files.map(item => {
      let filepath = path.normalize(p + sep + item);
      if (isDir(filepath)) {
        return rmdir(filepath, false);
      }else{
        let deferred = defer();
        fs.unlink(filepath, err => {
          return err ? deferred.reject(err) : deferred.resolve();
        });
        return deferred.promise;
      }
    });
    let promise = files.length === 0 ? Promise.resolve() : Promise.all(promises);
    return promise.then(() => {
      if (!reserve) {
        let deferred = defer();
        fs.rmdir(p, err => {
          return err ? deferred.reject(err) : deferred.resolve();
        });
        return deferred.promise;
      }
    }).then(() => {
      deferred.resolve();
    }).catch(err => {
      deferred.reject(err);
    });
  });
  return deferred.promise;
};
/**
 * get files in path
 * @param  {} dir    []
 * @param  {} prefix []
 * @return {}        []
 */
let getFiles = (dir, prefix, filter) => {
  dir = path.normalize(dir);
  if (!fs.existsSync(dir)) {
    return [];
  }
  if(!isString(prefix)){
    filter = prefix;
    prefix = '';
  }
  if(filter === true){
    filter = item => {
      return item[0] !== '.';
    };
  }
  prefix = prefix || '';
  let files = fs.readdirSync(dir);
  let result = [];
  files.forEach(item => {
    let stat = fs.statSync(dir + sep + item);
    if (stat.isFile()) {
      if(!filter || filter(item)){
        result.push(prefix + item);
      }
    }else if(stat.isDirectory()){
      if(!filter || filter(item, true)){
        let cFiles = getFiles(dir + sep + item, prefix + item + sep, filter);
        result = result.concat(cFiles);
      }
    }
  });
  return result;
};
/**
 * change path mode
 * @param  {String} p    [path]
 * @param  {String} mode [path mode]
 * @return {Boolean}      []
 */
let chmod = (p, mode) => {
  mode = mode || '0777';
  if (!fs.existsSync(p)) {
    return true;
  }
  return fs.chmodSync(p, mode);
};
/**
 * get content md5
 * @param  {String} str [content]
 * @return {String}     [content md5]
 */
let md5 = str => {
  let instance = crypto.createHash('md5');
  instance.update(str + '', 'utf8');
  return instance.digest('hex');
};




let htmlMaps = {
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quote;',
  '\'': '&#39;'
};
let escapeHtml = str => {
  return (str + '').replace(/[<>'"]/g, a => {
    return htmlMaps[a];
  });
};

/**
 * get datetime
 * @param  {Date} date []
 * @return {String}      []
 */
let datetime = (date, format) => {
  let fn = d => {
    return ('0' + d).slice(-2);
  };

  if(date && isString(date)){
    date = new Date(Date.parse(date));
  }
  let d = date || new Date();

  format = format || 'YYYY-MM-DD HH:mm:ss';
  let formats = {
    YYYY: d.getFullYear(),
    MM: fn(d.getMonth() + 1),
    DD: fn(d.getDate()),
    HH: fn(d.getHours()),
    mm: fn(d.getMinutes()),
    ss: fn(d.getSeconds())
  };

  return format.replace(/([a-z])\1+/ig, a => {
    return formats[a] || a;
  });
};



/**
 * to fast properties
 * @param  {Object} obj []
 * @return {void}     []
 */
let toFastProperties = obj => {
  let f = () => {};
  f.prototype = obj;
  /*eslint-disable no-new*/
  new f();
};

export default {
  toFastProperties,
  promisify,
  sep,
  camelCase,
  defer,
  Class,
  extend,
  isClass,
  isBoolean,
  isNumber,
  isObject,
  isString,
  isArray,
  isFunction,
  isDate: util.isDate,
  isRegExp: util.isRegExp,
  isError: util.isError,
  isIP: net.isIP,
  isIP4: net.isIPv4,
  isIP6: net.isIPv6,
  isFile,
  isFileAsync,
  isDir,
  isDirAsync,
  isNumberString,
  isPromise,
  isWritable,
  isBuffer,
  isTrueEmpty,
  isEmpty,
  clone,
  mkdir,
  rmdir,
  md5,
  chmod,
  getFiles,
  escapeHtml,
  datetime
};
