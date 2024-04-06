import fs, { type Dirent } from 'node:fs'
import path from 'node:path'

const lchownSync = (path: string, uid: number, gid: number) => {
  try {
    return fs.lchownSync(path, uid, gid)
  } catch (er) {
    if ((er as NodeJS.ErrnoException)?.code !== 'ENOENT') throw er
  }
}

const chown = (
  cpath: string,
  uid: number,
  gid: number,
  cb: (er?: unknown) => any,
) => {
  fs.lchown(cpath, uid, gid, er => {
    // Skip ENOENT error
    cb(er && (er as NodeJS.ErrnoException)?.code !== 'ENOENT' ? er : null)
  })
}

const chownrKid = (
  p: string,
  child: Dirent,
  uid: number,
  gid: number,
  cb: (er?: unknown) => any,
) => {
  if (child.isDirectory()) {
    chownr(path.resolve(p, child.name), uid, gid, (er: unknown) => {
      if (er) return cb(er)
      const cpath = path.resolve(p, child.name)
      chown(cpath, uid, gid, cb)
    })
  } else {
    const cpath = path.resolve(p, child.name)
    chown(cpath, uid, gid, cb)
  }
}

export const chownr = (
  p: string,
  uid: number,
  gid: number,
  cb: (er?: unknown) => any,
) => {
  fs.readdir(p, { withFileTypes: true }, (er, children) => {
    // any error other than ENOTDIR or ENOTSUP means it's not readable,
    // or doesn't exist.  give up.
    if (er) {
      if (er.code === 'ENOENT') return cb()
      else if (er.code !== 'ENOTDIR' && er.code !== 'ENOTSUP')
        return cb(er)
    }
    if (er || !children.length) return chown(p, uid, gid, cb)

    let len = children.length
    let errState: null | NodeJS.ErrnoException = null
    const then = (er?: unknown) => {
      /* c8 ignore start */
      if (errState) return
      /* c8 ignore stop */
      if (er) return cb((errState = er as NodeJS.ErrnoException))
      if (--len === 0) return chown(p, uid, gid, cb)
    }

    for (const child of children) {
      chownrKid(p, child, uid, gid, then)
    }
  })
}

const chownrKidSync = (
  p: string,
  child: Dirent,
  uid: number,
  gid: number,
) => {
  if (child.isDirectory())
    chownrSync(path.resolve(p, child.name), uid, gid)

  lchownSync(path.resolve(p, child.name), uid, gid)
}

export const chownrSync = (p: string, uid: number, gid: number) => {
  let children: Dirent[]
  try {
    children = fs.readdirSync(p, { withFileTypes: true })
  } catch (er) {
    const e = er as NodeJS.ErrnoException
    if (e?.code === 'ENOENT') return
    else if (e?.code === 'ENOTDIR' || e?.code === 'ENOTSUP')
      return lchownSync(p, uid, gid)
    else throw e
  }

  for (const child of children) {
    chownrKidSync(p, child, uid, gid)
  }

  return lchownSync(p, uid, gid)
}
