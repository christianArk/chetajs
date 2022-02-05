import chalk from 'chalk';
import fs from 'fs';
import ncp from 'ncp';
import path from 'path';
import { promisify } from 'util';
import { makePackage } from './cmds/make';
import execa from 'execa';
import Listr from 'listr';
import { projectInstall } from 'pkg-install';

const access = promisify(fs.access);
const copy = promisify(ncp);

async function copyTemplateFiles(options) {
 return copy(options.templateDirectory, options.targetDirectory, {
   clobber: false,
 });
}

async function initGit(options) {
  const result = await execa('git', ['init'], {
    cwd: options.targetDirectory,
  })
  if(result.failed) {
    return Promise.reject(new Error('Failed to initialize git'))
  }
  return
}

export async function createProject(options) {
    options = {
      ...options,
      targetDirectory: `${process.cwd()}\/${options.projectName}`,
    };
   
    // const fullPathName = new URL(import.meta.url).pathname;
    const templateDir = path.resolve(
      __dirname,
      '../../templates/',
      options.template.toLowerCase(),
      'project-files'
    );
    options.templateDirectory = templateDir;
   
    try {
      await access(templateDir, fs.constants.R_OK);
    } catch (err) {
      console.log(chalk.red(err))
      console.error('%s Invalid template name', chalk.red.bold('ERROR'));
      process.exit(1);
    }

    const tasks = new Listr([
      {
        title: 'Copy project files',
        task: () => copyTemplateFiles(options),
      },
      {
        title: 'Create package.json file',
        task: () => makePackage(options),
      },
      {
        title: 'Initialize git',
        task: () => initGit(options),
        enabled: () => options.git,
      },
      {
        title: 'Install dependencies',
        task: () =>
          projectInstall({
            cwd: options.targetDirectory,
          }),
        skip: () =>
          !options.runInstall
            ? 'Pass --install to automatically install dependencies'
            : undefined,
      },
    ]);
    
    await tasks.run()
    console.log('%s Project ready', chalk.green.bold('DONE'));
    return true;
}