"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uninstall = exports.install = exports.showList = void 0;
var fs_1 = __importDefault(require("fs"));
var https_1 = __importDefault(require("https"));
var ora_1 = __importDefault(require("ora"));
var tar_1 = __importDefault(require("tar"));
var rimraf_1 = __importDefault(require("rimraf"));
var chalk_1 = __importDefault(require("chalk"));
/** 安装目录 */
var ineDir = '.ine-version';
/** 淘宝镜像 */
// const mirror = 'https://npm.taobao.org/mirrors/node';
var mirror = 'https://cdn.npm.taobao.org/dist/node';
var pkgName = function (v) { return "node-v" + v + "-darwin-x64.tar.gz"; };
var pkgUrl = function (v) { return mirror + "/v" + v + "/" + pkgName(v); };
var pkgPath = function (v) { return ineDir + "/" + pkgName(v); };
var version = ''; // 缓存已解析的版本
var spinner = ora_1.default();
/** GET 请求 */
function fetch(url) {
    return new Promise(function (resolve, reject) {
        var req = https_1.default.get(url, function (res) {
            var str = '';
            res.setEncoding('utf8');
            res.on('data', function (chunk) { return (str += chunk); });
            res.on('end', function () { return resolve(str); });
        });
        req.on('error', function (err) {
            reject(err);
        });
    });
}
/** 下载 tar */
function download(ver) {
    var path = pkgPath(ver);
    if (hasVersion(ver)) {
        return Promise.resolve(ver);
    }
    if (!fs_1.default.existsSync(ineDir)) {
        fs_1.default.mkdirSync(ineDir);
    }
    return new Promise(function (resolve, reject) {
        var req = https_1.default.get(pkgUrl(ver), function (res) {
            var totalLength = Number(res.headers['content-length']) || 0;
            var downloadedSize = 0;
            res
                .on('error', reject)
                .on('data', function (chunk) {
                downloadedSize += chunk.length;
                spinner.text = "node v" + ver + " \u4E0B\u8F7D\u4E2D " + ((downloadedSize / totalLength) * 100).toFixed(2) + "% ...";
            })
                .on('end', function () { return resolve(ver); })
                .pipe(fs_1.default.createWriteStream(path));
        });
        req.on('error', function (err) {
            reject(err);
        });
    });
}
/** 解压 tar */
function extract(ver) {
    return __awaiter(this, void 0, void 0, function () {
        var path, dir;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    path = pkgPath(ver);
                    dir = path.replace(/\.tar\.gz$/, '');
                    if (!!fs_1.default.existsSync(dir)) return [3 /*break*/, 2];
                    return [4 /*yield*/, new Promise(function (resolve, reject) {
                            fs_1.default.createReadStream(path)
                                .pipe(tar_1.default.x({ cwd: ineDir }))
                                .on('error', reject)
                                .on('end', function () { return resolve(ver); });
                        })];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2: return [2 /*return*/, ver];
            }
        });
    });
}
/** 使用指定版本 */
function useVersion(ver) {
    var target = pkgPath(ver).replace(/\.tar\.gz$/, '');
    rimraf_1.default.sync(ineDir + "/bin");
    fs_1.default.symlinkSync(target.replace(ineDir + "/", '') + "/bin", ineDir + "/bin", 'dir');
}
/** 是否有指定版本 */
function hasVersion(ver) {
    return fs_1.default.existsSync(pkgPath(ver));
}
/** 解析完整的版本 */
function parseVersion(ver) {
    return Promise.resolve(ver).then(function (ver) {
        if (version) {
            return version;
        }
        if (/^\d+\.\d+\.\d+$/.test(ver)) {
            return ver;
        }
        return showList(true, true).then(function (list) {
            var item = list.find(function (it) { return it.version.includes("v" + ver); });
            if (!item) {
                return Promise.reject(Error("\u7248\u672C " + version + " \u4E0D\u5B58\u5728"));
            }
            version = item.version.slice(1);
            return version;
        });
    });
}
/** 显示所有 node 版本 */
function showList(all, ret) {
    if (all === void 0) { all = false; }
    if (ret === void 0) { ret = false; }
    if (!ret) {
        spinner.start("\u6B63\u5728\u8BFB\u53D6" + (all ? '所有' : 'LTS') + "\u7248\u672C\u5217\u8868...");
    }
    return fetch(mirror + "/index.json")
        .then(function (res) {
        var list = JSON.parse(res);
        var arr = list
            .filter(function (it) { return (all ? true : it.lts); })
            .filter(function (it) {
            it.ver = Number(it.version.replace(/^v(\d+)[\d.]+$/, '$1'));
            return it.ver >= 4;
        });
        var str = arr
            .map(function (it) {
            var name = "" + it.version.padEnd(8) + (it.lts ? ' lts' : '');
            if (hasVersion(it.version.slice(1))) {
                name = name.replace(/\d+\.\d+\.\d+/, function (s) { return chalk_1.default.green.bold(s); }) + ' (已安装)';
            }
            return "  " + name.slice(1);
        })
            .join('\n');
        if (!ret) {
            spinner.succeed("\u4EE5\u4E0B\u662F" + (all ? '所有' : 'LTS') + "\u53EF\u5B89\u88C5\u7684\u7248\u672C:\n" + str);
        }
        return arr;
    })
        .catch(function (err) {
        if (!ret) {
            spinner.succeed('加载失败，请重试。');
            console.error(err);
        }
        else {
            return Promise.reject(err);
        }
    });
}
exports.showList = showList;
/** 安装指定版本 */
function install(ver) {
    return __awaiter(this, void 0, void 0, function () {
        var err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    spinner.start("\u6B63\u5728\u5B89\u88C5 node v" + ver + "...");
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 6, , 7]);
                    return [4 /*yield*/, parseVersion(ver)];
                case 2:
                    ver = _a.sent();
                    spinner.text = "node v" + ver + " \u4E0B\u8F7D\u4E2D 0%...";
                    return [4 /*yield*/, download(ver)];
                case 3:
                    _a.sent();
                    spinner.text = "node v" + ver + " \u89E3\u538B\u4E2D...";
                    return [4 /*yield*/, extract(ver)];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, useVersion(ver)];
                case 5:
                    _a.sent();
                    spinner.succeed("node v" + ver + " \u5B89\u88C5\u5B8C\u6210\uFF01");
                    if (!process.env.PATH.includes(ineDir)) {
                        console.log("\u8BF7\u5C06 " + chalk_1.default.blue(ineDir + '/bin') + " \u6DFB\u52A0\u5230\u73AF\u5883\u53D8\u91CF " + chalk_1.default.green('PATH') + " \u7684\u6700\u524D\u9762");
                        console.log("\u60A8\u53EF\u4EE5\u5728 " + chalk_1.default.blue('~/.bashrc') + " \u6216 " + chalk_1.default.blue('~/.zshrc') + " \u672B\u5C3E\u6DFB\u52A0 " + chalk_1.default.redBright('export') + " " + chalk_1.default.green("PATH=" + ineDir + "/bin:$PATH"));
                    }
                    return [3 /*break*/, 7];
                case 6:
                    err_1 = _a.sent();
                    spinner.fail("node v" + ver + " \u5B89\u88C5\u5931\u8D25\uFF01");
                    console.error(err_1);
                    return [3 /*break*/, 7];
                case 7: return [2 /*return*/];
            }
        });
    });
}
exports.install = install;
/** 卸载版本 */
function uninstall() {
    rimraf_1.default.sync(ineDir);
    spinner.succeed("\u5220\u9664\u6210\u529F\uFF01");
}
exports.uninstall = uninstall;
