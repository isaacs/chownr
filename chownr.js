'use strict'
const fs = require('fs')
const path = require('path')

const chownr = (p, uid, gid, cb) => {
  fs.readdir(p, (er, children) => {
    // any error other than ENOTDIR means it's not readable, or
    // doesn't exist.  give up.
    if (er && er.code !== 'ENOTDIR') return cb(er)
    if (er || !children.length) return fs.lchown(p, uid, gid, cb)

    let len = children.length
    let errState = null
    const then = er => {
      if (errState) return
      if (er) return cb(errState = er)
      if (-- len === 0) return fs.lchown(p, uid, gid, cb)
    }

    children.forEach(child => {
      const pathChild = path.resolve(p, child)
      fs.lstat(pathChild, (er, stats) => {
        if (er)
          return cb(er)
        if (!stats.isSymbolicLink())
          chownr(pathChild, uid, gid, then)
        else
          then()
        })
    })
  })
}

const chownrSync = (p, uid, gid) => {
  let children
  try {
    children = fs.readdirSync(p)
  } catch (er) {
    if (er && er.code === 'ENOTDIR') return fs.lchownSync(p, uid, gid)
    throw er
  }
  if (!children.length) return fs.lchownSync(p, uid, gid)

  children.forEach(child => {
    const pathChild = path.resolve(p, child)
    const stats = fs.lstatSync(pathChild)
    if (!stats.isSymbolicLink())
      chownrSync(pathChild, uid, gid)
  })

  return fs.lchownSync(p, uid, gid)
}

module.exports = chownr
chownr.sync = chownrSync
