if (!process.getuid || !process.getgid) {
  throw new Error("Tests require getuid/getgid support")
}

const fs = require('fs')
const readdir = fs.readdir
fs.readdir = (path, options, cb) => readdir(path, cb || options)
const readdirSync = fs.readdirSync
fs.readdirSync = (path, options) => readdirSync(path)

const t = require('tap')
t.comment('basic.js')
require('./basic.js')
t.comment('sync.js')
require('./sync.js')
t.comment('concurrent.js')
require('./concurrent.js')
t.comment('concurrent-sync.js')
require('./concurrent-sync.js')
