#!/usr/bin/env node

let fs = require('fs');
let util = require('util');
let cp = require('child_process');
let = exec = util.promisify(cp.exec);

let args = process.argv.slice(2);
let source = args[0];
let target = args[1];
let commentFrames = args[2] == '-c';

(async function main() {

    let groups = groupFileLines(source);
    groups = await processCodeGroups(groups);
    let output = rebuildGroups(groups);
    output = applyCommentSwitch(output);

    if (target == undefined) {
        console.log({output});
        return;
    }

    fs.writeFileSync(target, output);

}())

function applyCommentSwitch (input) {

    let lines = input.split('\r\n');
    let output = '';
    
    for (let line of lines) {

        let ft = frameType(line);
        let leaveAsIs = 
            ft == null ||
            (commentFrames && ft == 'comment') ||
            (!commentFrames && ft == 'code');

        if (leaveAsIs) { 
            output += `\r\n${line}`;
            continue;
        }

        let fa = parseFrameArgs(line);

        output += commentFrames 
            ? `\r\n[${fa.language || '--'}]: # (`
            : `\r\n    ````${fa.language || ''} {`;

        for(let key of Object.keys(fa)) {
            if (key == 'language')
                continue;
            output += `${key}=${fa[key]}`;
        }

        output += commentFrames ? ')' : `}`;

    }

    return output;

}

function rebuildGroups(groups) {
    let output = '';
    for(let group of groups) {
        output += 
            (group.frameStarter ? group.frameStarter + '\r\n' : '') +
            group.value + '\r\n' + 
            (group.frameEnder ? group.frameEnder + '\r\n' : '')
    }
    return output;
}

async function processCodeGroups (groups) {

    let output = '';

    for(var group of groups) 
        if (group.type == 'code' && group.frameArgs.log == 'true') {

            let setup = '';

            if (output != '')
                output += '\r\n';

            if (group.frameArgs.setup) {
                if(!group.frameArgs.setup.includes(':'))
                    group.frameArgs.setup = 
                        source + ':' + 
                        group.frameArgs.setup;
                let [f,id] = group.frameArgs.setup.split(':');
                setup += getGroupById(f, id).value;
            }

            output += await captureOutput(setup + ';' + group.value);

        }
        else if (group.type == 'code' && group.frameArgs.output == 'true') {
            let leadSpace = group.frameStarter.match(/\s*/);
            group.value = leadSpace + output.replace(/\n/g,'\n' + leadSpace); 
            output = '';
        }

    return groups;

}

function getGroupById (file, id) {
    return groupFileLines(file)
        .find(group => 
            group.frameArgs &&
            group.frameArgs.id && 
            group.frameArgs.id == id
        );
}

function groupFileLines (file) {

    let lines = fs.readFileSync(file)
        .toString()
        .split('\r\n');

    let groups = [];
    let group = { 
        type: 'md', 
        value: null
    };

    for(let line of lines) 

        if (group.type == 'md' && isFrameStart(line)) {
            groups.push(group);
            group = {
                type: 'code',
                frameStarter: line,
                frameArgs: parseFrameArgs(line),
                value: null 
            }

        }
        else if (group.type == 'code' && isFrameEnd(line))  
            group.frameEnder = line;
        else if (group.type == 'code' && group.frameEnder) {
            groups.push(group);
            group = {
                type: 'md',
                value: line 
            }
        } 
        else {
            group.value == null
                ? group.value = ''
                : group.value += '\r\n';
            group.value += line;
        }

    groups.push(group);

    return groups;
    
}

function isFrameStart (line) { 
    return  line.trim().startsWith('```') || // ```lang {...}
            line.trim().match(/^\[\w+\]: # \(.+\)/); // [lang]: # (...)
}

function isFrameEnd (line) { 
    return  line.trim() == '```' || // ```
            line.trim().match(/^\[\w+\]: # \(\)/); // [lang]: # ()
}

function frameType (line) {
    return line.trim().startsWith('```') ? 'code'
        :   line.trim().endsWith('```') ? 'code'
        :   line.trim().match(/^\[\w+\]: # \(/) ? 'comment' // [lang]: # (...
        :   null;
}

function parseFrameArgs (line) {
    
    let frameArgs = {};

    let language = line.trim().startsWith('```')
        ? line.match(/(?<=```).+?(?=\s)/g) // text between ``` and space
        : line.match(/(?<=\[).+?(?=\])/g); // text between []

    if(language)
        frameArgs.language = language.toString();

    let match = line.trim().startsWith('```')
        ? line.match(/(?<=\{).+(?=\})/mg) // text between {}
        : line.match(/(?<=\().+(?=\))/mg); // text ()

    if (match) 
        match
        .toString()
        .split(',')
        .map(s => s.split('='))
        .reduce((obj,sp) => {
            obj[sp[0].trim()] = sp[1].trim();
            return obj;
        }, frameArgs);

    return frameArgs;

}

async function captureOutput(script) {
    
    let output = '';

    fs.writeFileSync('./mdlogger.tempscript.js', script);

    await exec('node ./mdlogger.tempscript.js')
        .then(log => {
            output += log.stdout.trim() + log.stderr.trim();
        })
        .catch(error => {
            console.log('exec error: ' + error);
        });

    return output;

}
