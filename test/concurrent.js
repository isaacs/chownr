if (!process.getuid || !process.getgid) {
  throw new Error("Tests require getuid/getgid support")
}

var curUid = +process.getuid()
, curGid = +process.getgid()
, test = require("tap").test
, mkdirp = require("mkdirp")
, rimraf = require("rimraf")
, fs = require("fs")
, path = require("path")

// sniff the 'id' command for other groups that i can legally assign to
var exec = require("child_process").exec
, groups
, dirs = []
, files = []

// Monkey-patch fs.readdir to remove f1 before the callback happens
const readdir = fs.readdir

var chownr = require("../")

exec("id", function (code, output) {
  if (code) throw new Error("failed to run 'id' command")
  groups = output.trim().split("=")[3].split(",").map(function (s) {
    return parseInt(s, 10)
  }).filter(function (g) {
    return g !== curGid
  })

  // console.error([curUid, groups[0]], "uid, gid")

  rimraf("/tmp/chownr", function (er) {
    if (er) throw er
    var cnt = 5
    for (var i = 0; i < 5; i ++) {
      mkdirp(getDir(), then)
    }
    function then (er, made) {
      if (er) throw er
      var f1 = path.join(made, "f1");
      files.push(f1)
      fs.writeFile(f1, "file-1", er => {
        if (er) throw er
        var f2 = path.join(made, "f2");
        files.push(f2)
        fs.writeFile(f2, "file-2", er => {
          if (er) throw er
          if (-- cnt === 0) {
            runTest()
          }
        })
      })
    }
  })
})

function getDir () {
  var dir = "/tmp/chownr"

  dir += "/" + Math.floor(Math.random() * Math.pow(16,4)).toString(16)
  dirs.push(dir)
  dir += "/" + Math.floor(Math.random() * Math.pow(16,4)).toString(16)
  dirs.push(dir)
  dir += "/" + Math.floor(Math.random() * Math.pow(16,4)).toString(16)
  dirs.push(dir)
  return dir
}

function runTest () {
  test("patch fs.readdir", function (t) {
    // Monkey-patch fs.readdir to remove f1 before the callback happens
    // This simulates the case where some files are deleted when chownr
    // is in progress asynchronously
    fs.readdir = function () {
      const args = [].slice.call(arguments)
      const cb = args.pop()
      const dir = args[0]
      args.push((er, children) => {
        if (er) return cb(er)
        fs.unlink(path.join(dir, 'f1'), er => {
          if (er && er.code === 'ENOENT') return cb(null, children)
          cb(er, children)
        });
      });
      readdir.apply(fs, args);
    }
    t.end()
  })

  test("should complete successfully", function (t) {
    // console.error("calling chownr", curUid, groups[0], typeof curUid, typeof groups[0])
    chownr("/tmp/chownr", curUid, groups[0], function (er) {
      t.ifError(er)
      t.end()
    })
  })


  test("restore fs.readdir", function (t) {
    // Restore fs.readdir
    fs.readdir = readdir
    t.end()
  })

  dirs.forEach(function (dir) {
    test("verify "+dir, function (t) {
      fs.stat(dir, function (er, st) {
        if (er) {
          t.ifError(er)
          return t.end()
        }
        t.equal(st.uid, curUid, "uid should be " + curUid)
        t.equal(st.gid, groups[0], "gid should be "+groups[0])
        t.end()
      })
    })
  })

  files.forEach(function (f) {
    test("verify "+f, function (t) {
      fs.stat(f, function (er, st) {
        if (er) {
          if (er.code !== 'ENOENT')
            t.ifError(er)
          return t.end()
        }
        t.equal(st.uid, curUid, "uid should be " + curUid)
        t.equal(st.gid, groups[0], "gid should be "+groups[0])
        t.end()
      })
    })
  })

  test("cleanup", function (t) {
    rimraf("/tmp/chownr/", function (er) {
      t.ifError(er)
      t.end()
    })
  })
}

