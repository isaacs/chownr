'use strict'
var fs = require('fs')
var path = require('path')

/* istanbul ignore next */
var LCHOWN = fs.lchown ? 'lchown' : 'chown'
/* istanbul ignore next */
var LCHOWNSYNC = fs.lchownSync ? 'lchownSync' : 'chownSync'

// fs.readdir could only accept an options object as of node v6
var nodeVersion = process.version
var readdir = function(path, options, cb) {
  return fs.readdir(path, options, cb)
}
var readdirSync = function(path, options) {
  return fs.readdirSync(path, options)
}
/* istanbul ignore next */
if (/^v4\./.test(nodeVersion))
  readdir = function (path, options, cb) { return fs.readdir(path, cb) }

var chownrKid = function (p, child, uid, gid, cb) {
  if (typeof child === 'string')
    return fs.lstat(path.resolve(p, child), function (er, stats) {
      if (er)
        return cb(er)
      stats.name = child
      chownrKid(p, stats, uid, gid, cb)
    })

  if (child.isDirectory()) {
    chownr(path.resolve(p, child.name), uid, gid, function (er) {
      if (er)
        return cb(er)
      fs[LCHOWN](path.resolve(p, child.name), uid, gid, cb)
    })
  } else
    fs[LCHOWN](path.resolve(p, child.name), uid, gid, cb)
}


var chownr = (p, uid, gid, cb) => {
  readdir(p, { withFileTypes: true }, function (er, children) {
    // any error other than ENOTDIR or ENOTSUP means it's not readable,
    // or doesn't exist.  give up.
    if (er && er.code !== 'ENOTDIR' && er.code !== 'ENOTSUP')
      return cb(er)
    if (er || !children.length) return fs[LCHOWN](p, uid, gid, cb)

    var len = children.length
    var errState = null
    var then = function (er) {
      if (errState) return
      if (er) return cb(errState = er)
      if (-- len === 0) return fs[LCHOWN](p, uid, gid, cb)
    }

    children.forEach(function (child) {
      return chownrKid(p, child, uid, gid, then)
    })
  })
}

var chownrKidSync = function (p, child, uid, gid) {
  if (typeof child === 'string') {
    var stats = fs.lstatSync(path.resolve(p, child))
    stats.name = child
    child = stats
  }

  if (child.isDirectory())
    chownrSync(path.resolve(p, child.name), uid, gid)

  fs[LCHOWNSYNC](path.resolve(p, child.name), uid, gid)
}

var chownrSync = function (p, uid, gid) {
  var children
  try {
    children = readdirSync(p, { withFileTypes: true })
  } catch (er) {
    if (er && er.code === 'ENOTDIR' && er.code !== 'ENOTSUP')
      return fs[LCHOWNSYNC](p, uid, gid)
    throw er
  }

  if (children.length)
    children.forEach(function(child) { return chownrKidSync(p, child, uid, gid) })

  return fs[LCHOWNSYNC](p, uid, gid)
}

module.exports = chownr
chownr.sync = chownrSync
