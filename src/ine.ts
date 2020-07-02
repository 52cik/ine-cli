import fs from 'fs';
import https from 'https';
import ora from 'ora';
import tar from 'tar';
import rimraf from 'rimraf';
import chalk from 'chalk';

/** 安装目录 */
const ineDir = '.ine-version';
/** 淘宝镜像 */
// const mirror = 'https://npm.taobao.org/mirrors/node';
const mirror = 'https://cdn.npm.taobao.org/dist/node';

const pkgName = (v: string) => `node-v${v}-darwin-x64.tar.gz`;
const pkgUrl = (v: string) => `${mirror}/v${v}/${pkgName(v)}`;
const pkgPath = (v: string) => `${ineDir}/${pkgName(v)}`;

let version = ''; // 缓存已解析的版本

const spinner = ora();

/** GET 请求 */
function fetch(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let str = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => (str += chunk));
      res.on('end', () => resolve(str));
    });
    req.on('error', (err) => {
      reject(err);
    });
  });
}

/** 下载 tar */
function download(ver: string) {
  const path = pkgPath(ver);

  if (hasVersion(ver)) {
    return Promise.resolve(ver);
  }

  if (!fs.existsSync(ineDir)) {
    fs.mkdirSync(ineDir);
  }

  return new Promise((resolve, reject) => {
    const req = https.get(pkgUrl(ver), (res) => {
      const totalLength = Number(res.headers['content-length']) || 0;
      let downloadedSize = 0;
      res
        .on('error', reject)
        .on('data', (chunk) => {
          downloadedSize += chunk.length;
          spinner.text = `node v${ver} 下载中 ${((downloadedSize / totalLength) * 100).toFixed(
            2,
          )}% ...`;
        })
        .on('end', () => resolve(ver))
        .pipe(fs.createWriteStream(path));
    });
    req.on('error', (err) => {
      reject(err);
    });
  });
}

/** 解压 tar */
async function extract(ver: string) {
  const path = pkgPath(ver);
  const dir = path.replace(/\.tar\.gz$/, '');

  if (!fs.existsSync(dir)) {
    await new Promise((resolve, reject) => {
      fs.createReadStream(path)
        .pipe(tar.x({ cwd: ineDir }))
        .on('error', reject)
        .on('end', () => resolve(ver));
    });
  }

  return ver;
}

/** 使用指定版本 */
function useVersion(ver: string) {
  const target = pkgPath(ver).replace(/\.tar\.gz$/, '');
  rimraf.sync(`${ineDir}/bin`);
  fs.symlinkSync(`${target.replace(`${ineDir}/`, '')}/bin`, `${ineDir}/bin`, 'dir');
}

/** 是否有指定版本 */
function hasVersion(ver: string) {
  return fs.existsSync(pkgPath(ver));
}

/** 解析完整的版本 */
function parseVersion(ver: string) {
  return Promise.resolve(ver).then((ver) => {
    if (version) {
      return version;
    }

    if (/^\d+\.\d+\.\d+$/.test(ver)) {
      return ver;
    }

    return showList(true, true).then((list) => {
      const item = list!.find((it) => it.version.includes(`v${ver}`));
      if (!item) {
        return Promise.reject(Error(`版本 ${version} 不存在`));
      }
      version = item.version.slice(1);
      return version;
    });
  });
}

/** ************* 命令行方法 ************* **/

interface nodeVersionItem {
  version: string;
  date: string;
  files: string[];
  npm: string;
  v8: string;
  uv: string;
  zlib: string;
  openssl: string;
  modules: string;
  lts: boolean;
  security: boolean;
  ver: number;
}

/** 显示所有 node 版本 */
export function showList(all = false, ret = false) {
  if (!ret) {
    spinner.start(`正在读取${all ? '所有' : 'LTS'}版本列表...`);
  }

  return fetch(`${mirror}/index.json`)
    .then((res) => {
      const list: nodeVersionItem[] = JSON.parse(res);

      const arr = list
        .filter((it) => (all ? true : it.lts))
        .filter((it) => {
          it.ver = Number(it.version.replace(/^v(\d+)[\d.]+$/, '$1'));
          return it.ver >= 4;
        });

      const str = arr
        .map((it) => {
          let name = `${it.version.padEnd(8)}${it.lts ? ' lts' : ''}`;
          if (hasVersion(it.version.slice(1))) {
            name = name.replace(/\d+\.\d+\.\d+/, (s) => chalk.green.bold(s)) + ' (已安装)';
          }
          return `  ${name.slice(1)}`;
        })
        .join('\n');

      if (!ret) {
        spinner.succeed(`以下是${all ? '所有' : 'LTS'}可安装的版本:\n${str}`);
      }

      return arr;
    })
    .catch((err) => {
      if (!ret) {
        spinner.succeed('加载失败，请重试。');
        console.error(err);
      } else {
        return Promise.reject(err);
      }
    });
}

/** 安装指定版本 */
export async function install(ver: string) {
  spinner.start(`正在安装 node v${ver}...`);

  try {
    ver = await parseVersion(ver);

    spinner.text = `node v${ver} 下载中 0%...`;
    await download(ver);

    spinner.text = `node v${ver} 解压中...`;
    await extract(ver);
    await useVersion(ver);

    spinner.succeed(`node v${ver} 安装完成！`);

    if (!process.env.PATH!.includes(ineDir)) {
      console.log(
        `请将 ${chalk.blue(ineDir + '/bin')} 添加到环境变量 ${chalk.green('PATH')} 的最前面`,
      );
      console.log(
        `您可以在 ${chalk.blue('~/.bashrc')} 或 ${chalk.blue(
          '~/.zshrc',
        )} 末尾添加 ${chalk.redBright('export')} ${chalk.green(`PATH=${ineDir}/bin:$PATH`)}`,
      );
    }
  } catch (err) {
    spinner.fail(`node v${ver} 安装失败！`);
    console.error(err);
  }
}

/** 卸载版本 */
export function uninstall() {
  rimraf.sync(ineDir);
  spinner.succeed(`删除成功！`);
}
