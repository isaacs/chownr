if (!process.getuid || !process.getgid) {
  throw new Error("Tests require getuid/getgid support")
}

var curUid = +process.getuid()
, curGid = +process.getgid()
, chownr = require("../")
, test = require("tap").test
, mkdirp = require("mkdirp")
, rimraf = require("rimraf")
, fs = require("fs")

// sniff the 'id' command for other groups that i can legally assign to
var exec = require("child_process").exec
, groups
, dirs = []

exec("id", function (code, output) {
  if (code) throw new Error("failed to run 'id' command")
  groups = output.trim().split("=")[3].split(",").map(function (s) {
    return parseInt(s, 10)
  }).filter(function (g) {
    return g !== curGid
  })

  console.error([curUid, groups[0]], "uid, gid")

  rimraf("dir", function (er) {
    if (er) throw er
    fs.mkdirSync("dir")
    fs.symlinkSync("/bin/sh", "dir/sh-link")
    runTest()
  })
})

function runTest () {
  test("should complete successfully", function (t) {
    console.error("calling chownr", curUid, groups[0], typeof curUid, typeof groups[0])
    chownr("dir", curUid, groups[0], function (er) {
      t.ifError(er)
      t.end()
    })
  })

  test("verify "+"sh-link", function (t) {
     fs.stat("dir/sh-link", function (er, st) {
      if (er) {
        t.ifError(er)
        return t.end()
      }
      t.notEqual(st.uid, curUid, "uid not should be " + curUid)
      t.notEqual(st.gid, groups[0], "gid not should be "+groups[0])
      t.end()
    })
  })


  test("cleanup", function (t) {
    rimraf("dir", function (er) {
      t.ifError(er)
      t.end()
    })
  })
}

