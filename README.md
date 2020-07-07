# ine-cli

> 独立 node 环境，将 node 安装当当前目录，不影响其他项目。

**Is still in the project experimental stage.**


```sh
$ ine

独立 node 环境，将 node 安装当当前目录，不影响其他项目。

使用:
  $ ine <cmd>

选项:
  -h, --help     显示帮助信息
  -v, --version  显示版本信息

命令:
  ls [-a, --all]        列出 LTS 版本 (-a 所有版本)
  install, i [version]  安装指定版本
  uninstall, uni        卸载安装目录

例子
  $ ine ls
  ✔ 以下是LTS可安装的版本:
    v12.18.2 lts
    v10.21.0 lts
    ...
  $ ine ls -a
  ✔ 以下是所有可安装的版本:
    14.5.0
    14.4.0
    ...
  $ ine i 12
  ✔ node v10.21.0 完成！
  $ ine uni
  ✔ 删除成功！
```
