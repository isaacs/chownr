if (!process.getuid || !process.getgid) {
  throw new Error('Tests require getuid/getgid support')
}
import { chownr } from '../dist/esm/index.js'
import t from 'tap'
import fs from 'fs'
import { exec } from 'child_process'

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

t.test('run test', t => {
  const dir = t.testdir({
    f1: 'f1',
    f2: 'f2',
    d1: {},
    d2: {},
    a: {
      d1: {},
      d2: {},
      f1: 'f1',
      f2: 'f2',
      b: {
        d1: {},
        d2: {},
        f1: 'f1',
        f2: 'f2',
        c: { d1: {}, d2: {}, f1: 'f1', f2: 'f2' },
      },
    },
    d: {
      d1: {},
      d2: {},
      f1: 'f1',
      f2: 'f2',
      e: {
        d1: {},
        d2: {},
        f1: 'f1',
        f2: 'f2',
        f: { d1: {}, d2: {}, f1: 'f1', f2: 'f2' },
      },
    },
    g: {
      d1: {},
      d2: {},
      f1: 'f1',
      f2: 'f2',
      h: {
        d1: {},
        d2: {},
        f1: 'f1',
        f2: 'f2',
        i: { d1: {}, d2: {}, f1: 'f1', f2: 'f2' },
      },
    },
    j: {
      d1: {},
      d2: {},
      f1: 'f1',
      f2: 'f2',
      k: {
        d1: {},
        d2: {},
        f1: 'f1',
        f2: 'f2',
        l: { d1: {}, d2: {}, f1: 'f1', f2: 'f2' },
      },
    },
    m: {
      d1: {},
      d2: {},
      f1: 'f1',
      f2: 'f2',
      n: {
        d1: {},
        d2: {},
        f1: 'f1',
        f2: 'f2',
        o: { d1: {}, d2: {}, f1: 'f1', f2: 'f2' },
      },
    },
  })

  t.test('should complete successfully', { bail: true }, t => {
    const readdir = fs.readdir
    fs.readdir = (...args) => {
      const cb = args.pop()
      readdir(...args, (er, children) => {
        if (er) return cb(er)
        try {
          fs.unlinkSync(`${args[0]}/f2`)
        } catch (_) {}
        try {
          fs.rmdirSync(`${args[0]}/d1`)
        } catch (_) {}
        try {
          fs.writeFileSync(`${args[0]}/d1`, 'now a file!')
        } catch (_) {}
        try {
          fs.rmdirSync(`${args[0]}/d2`)
        } catch (_) {}
        cb(null, children)
      })
    }
    t.teardown(() => (fs.readdir = readdir))

    chownr(dir, curUid, groups[0], er => {
      if (er) throw er
      t.end()
    })
  })

  const dirs = [
    '',
    'a',
    'a/b',
    'a/b/c',
    'd',
    'd/e',
    'd/e/f',
    'g',
    'g/h',
    'g/h/i',
    'j',
    'j/k',
    'j/k/l',
    'm',
    'm/n',
    'm/n/o',
  ]

  dirs.forEach(d =>
    t.test(`verify ${d}`, t => {
      t.match(fs.statSync(`${dir}/${d}`), {
        uid: curUid,
        gid: groups[0],
      })
      t.match(fs.statSync(`${dir}/${d}/f1`), {
        uid: curUid,
        gid: groups[0],
      })
      const st = fs.statSync(`${dir}/${d}/d1`)
      t.equal(st.isFile(), true, 'd1 turned into a file')
      t.match(st, {
        uid: curUid,
        gid: groups[0],
      })
      t.throws(() => fs.statSync(`${dir}/${d}/f2`))
      t.throws(() => fs.statSync(`${dir}/${d}/d2`))
      t.end()
    }),
  )
  t.end()
})
