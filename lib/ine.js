const fs = require('fs');
const os = require('os');

const got = require('got');
const ora = require('ora');
const tar = require('tar');
const unzip = require('unzip');
const rimraf = require('rimraf');
const mkdirp = require('mkdirp');

const ineDir = '.ine-versions';
const cacheDir = `${os.homedir()}/${ineDir}`;
const versionFile = `${cacheDir}/versions.json`;
const platform = process.platform; // darwin|win32|linux
const isWin = process.platform === 'win32';
// const mirror = 'https://npm.taobao.org/mirrors/node';
const mirror = 'http://cdn.npm.taobao.org/dist/node';

let cacheJSON = {};

// download use
const pkgName = {
  darwin: 'node-v@v-darwin-x64.tar.gz',
  win32: `node-v@v-win-${process.arch}.zip`,
};
const pkg = pkgName[platform];

const spinner = ora();

if (!fs.existsSync(cacheDir)) {
  init();
}

/**
 * init
 */
function init() {
  mkdirp.sync(cacheDir);
  mkdirp.sync(ineDir);
  fs.writeFileSync(versionFile, '{}', 'utf8');
}

/**
 * resoling the real version number
 *
 * @param {string} version
 * @returns
 */
function parseVersion(version) {
  // TODO: x.x version format support
  return Promise.resolve(version)
    .then((version) => {
      const ret = String(version).match(/^(\d+)(\.\d+){0,2}$/);
      if (ret === null) {
        return Promise.reject(version);
      }
      return Promise.resolve({ version, v: ret[1] });
    })
    .then(({ version, v }) => {
      if (/^\d+\.\d+\.\d+$/.test(version)) {
        return Promise.resolve(version);
      }
      return got(`${mirror}/latest-v${v}.x/SHASUMS256.txt`)
        .then((res) => {
          const ret = String(res.body).match(/\d+\.\d+\.\d+/);
          if (ret === null) {
            return Promise.reject(version);
          }
          return Promise.resolve(ret[0]);
        });
    })
    .catch((version) => {
      // 8 => 8.0.0, 8.6 => 8.6.0
      return Promise.resolve(`${version}.0.0`.replace(/^(\d+\.\d+\.\d+).+/, '$1'));
    });
}

/**
 * get cache file path
 *
 * @param {string} version
 * @returns
 */
function fromCache(version) {
  if (!fs.existsSync(versionFile)) {
    return false;
  }

  const versions = getVersion();
  const filename = (versions[platform] || 0)[version];

  if (filename === undefined) {
    return false;
  }

  return filename;
}

/**
 * download file to cache dir
 *
 * @param {string} version
 * @param {string} dir
 * @returns
 */
function download(version, dir) {
  return new Promise((resolve, reject) => {
    const file = pkg.replace('@v', version);
    // FIXME: Empty file detection
    got
      .stream(`${mirror}/v${version}/${file}`)
      .on('error', reject)
      .on('end', () => {
        saveVersion(version, file);
        resolve({ version, file });
      })
      .pipe(fs.createWriteStream(`${dir}/${file}`));
  });
}

/**
 * get versions json
 *
 * @returns
 */
function getVersion() {
  cacheJSON = require(versionFile);
  return cacheJSON;
}

/**
 * set versions json
 *
 * @param {string} version
 * @param {string} file
 */
function saveVersion(version, file) {
  if (!cacheJSON[platform]) {
    cacheJSON[platform] = {};
  }
  cacheJSON[platform][version] = file;
  fs.writeFileSync(versionFile, JSON.stringify(cacheJSON), 'utf8');
}

/**
 * Short format for `ms`.
 *
 * @param {number} ms
 * @return {String}
 */
function ms(ms) {
  const s = 1000;
  const m = s * 60;

  if (ms >= m) {
    return (ms / m).toFixed(2) + 'm';
  }
  if (ms >= s) {
    return (ms / s).toFixed(2) + 's';
  }
  return ms + 'ms';
}


/** commond *************************/

function install(version) {
  uninstall(); // clean
  mkdirp.sync(ineDir); // create dir
  const timeStart = Date.now();

  spinner.start(`Parsing version ${version} from taobao mirror...`);
  parseVersion(version)
    .then((version) => {
      const file = fromCache(version);
      if (file) {
        return Promise.resolve({ version, file });
      }
      spinner.start(`Downloading version v${version} from taobao mirror...`);
      return download(version, cacheDir);
    })
    .then(({ version, file }) => {
      const pack = fs.createReadStream(`${cacheDir}/${file}`);
      spinner.start(`Being extract v${version}...`);
      return new Promise((resolve, reject) => {
        function done() {
          const dir = file.replace(/\.(zip|tar\.gz)/, '');
          fs.writeFileSync(`${ineDir}/version.json`, JSON.stringify({ dir }));
          resolve({ version, dir });
        }
        if (isWin) {
          pack.pipe(unzip.Extract({ path: ineDir }))
            .on('finish', done)
            .on('error', reject);
        } else {
          pack.pipe(tar.x({ cwd: ineDir }))
            .on('end', done)
            .on('error', reject);
        }
      });
    })
    .then(link)
    .then(({ version }) => {
      const timeDone = Date.now() - timeStart;
      spinner.clear().succeed(`Done in ${ms(timeDone)}, node v${version} is ready for you.`);
    })
    .catch((err) => {
      spinner.clear().fail(err.message);
    });
}

/**
 * Clean up the current directory version files
 *
 * @param {bool} show Show cleanup log
 */
function uninstall(show) {
  rimraf.sync('node');
  rimraf.sync('npm');
  rimraf.sync(ineDir);
  show && spinner.clear().succeed('The local version is cleared.');
}

/**
 * Create symlink
 *
 * @param {bool|object} opt
 */
function link(opt) {
  const show = opt === true || opt.show === true;
  opt = opt || {};

  if (!opt.dir) {
    try {
      opt.dir = require(`./${ineDir}/version.json`);
    } catch (err) {
      return opt;
    }
  }

  // TODO: win compatible
  rimraf.sync('node');
  rimraf.sync('npm');
  fs.symlinkSync(`${ineDir}/${opt.dir}/bin/node`, 'node');
  fs.symlinkSync(`${ineDir}/${opt.dir}/lib/node_modules/npm/bin/npm-cli.js`, 'npm');

  show && spinner.clear().succeed('Created symlink for you.');
  return opt;
}

/**
 * cache clean
 */
function clearCache(show) {
  rimraf.sync(cacheDir);
  show && spinner.clear().succeed('Cleared cache.');
}

module.exports = {
  install,
  uninstall,
  link,
  clearCache,
};
