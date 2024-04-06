if (!process.getuid || !process.getgid) {
  throw new Error('Tests require getuid/getgid support')
}
import { exec } from 'child_process'
import fs from 'fs'
import t from 'tap'
import { chownr, chownrSync } from '../dist/esm/index.js'

const { lchownSync, lchown, readdir, readdirSync } = fs

const curUid = +process.getuid()
const curGid = +process.getgid()

let groups

t.test('get the ids to use', { bail: true }, t => {
  exec('id', function (code, output) {
    if (code) throw new Error("failed to run 'id' command")
    groups = output
      .trim()
      .split('=')[3]
      .split(',')
      .map(s => parseInt(s, 10))
      .filter(g => g !== curGid)
    t.end()
  })
})

t.test('fail lchown', t => {
  fs.lchownSync = (..._args) => {
    throw new Error('poop')
  }
  fs.lchown = (...args) => {
    args.pop()(new Error('poop'))
  }
  t.teardown(() => {
    fs.lchownSync = lchownSync
    fs.lchown = lchown
  })

  t.test('async fail', t => {
    const dir = t.testdir()
    chownr(dir, curUid, groups[0], er => {
      t.match(er, { message: 'poop' })
      t.end()
    })
  })

  t.test('sync fail', t => {
    const dir = t.testdir()
    t.throws(() => chownrSync(dir, curUid, groups[0]), {
      message: 'poop',
    })
    t.end()
  })

  t.end()
})

t.test('fail readdir', t => {
  fs.readdirSync = (..._args) => {
    throw new Error('poop')
  }
  fs.readdir = (...args) => {
    args.pop()(new Error('poop'))
  }
  t.teardown(() => {
    fs.readdirSync = readdirSync
    fs.readdir = readdir
  })

  t.test('async fail', t => {
    const dir = t.testdir()
    chownr(dir, curUid, groups[0], er => {
      t.match(er, { message: 'poop' })
      t.end()
    })
  })

  t.test('sync fail', t => {
    const dir = t.testdir()
    t.throws(() => chownrSync(dir, curUid, groups[0]), {
      message: 'poop',
    })
    t.end()
  })

  t.end()
})

t.test('bubble up async errors', t => {
  fs.readdir = (...args) => {
    fs.readdir = (...args) => {
      fs.readdir = (...args) => args.pop()(new Error('poop'))
      readdir(...args)
    }
    readdir(...args)
  }
  t.teardown(() => {
    fs.readdir = readdir
  })

  const dir = t.testdir({ a: { b: { c: { d: {} } } } })
  chownr(dir, curUid, groups[0], er => {
    t.match(er, { message: 'poop' })
    t.end()
  })
})
