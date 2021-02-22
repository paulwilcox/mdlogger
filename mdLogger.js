#!/usr/bin/env node

/*

  This code assumes that a naked '```' always ends a code frame.
  A starter should always have text coming after it.   

*/

let fs = require('fs');
let util = require('util');
let cp = require('child_process');
const { freemem } = require('os');
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
    output = applyProperBuffers(output);

    if (target == undefined) {
        console.log({output});
        return;
    }

    fs.writeFileSync(target, output);

}())

function applyProperBuffers (input) {

    let lines = input.split('\r\n');

    for(let i = 1; i < lines.length - 1; i++) {

        let ft = frameType(lines[i]);

        // if it's a normal or deleted line, move on
        if (lines[i] === undefined || !ft) 
            continue;

        let direction = isFrameStart(lines[i]) ? 1 : -1;

        // If it's 'code' type, remove blank lines before or after code
        if(ft == 'code') {
            let j = i + direction;
            while (
                j > 0 && 
                j < lines.length && 
                (lines[j] === undefined || lines[j].trim() === '')
            ) {
                lines[j] = undefined; 
                j += direction;
            }
        }

        // if it's a 'comment' type, ensure at least 
        // one blank line before or after code
        if(ft == 'comment') {
            if (lines[i + direction].trim() !== '')
                if (direction == 1)
                    lines[i] += '\r\n';
                if (direction == -1)
                    lines[i] = '\r\n' + lines[i];
        }
       
    }

    return lines
        .filter(line => line !== undefined)
        .join('\r\n');

}

function applyCommentSwitch (input) {

    let lines = input.split('\r\n');
    let output = '';
    
    for (let i = 0; i < lines.length; i++) {

        let line = lines[i];
        let nl = i == 0 ? '' : '\r\n';
        let ft = frameType(line);
        let leaveAsIs = 
            ft == null ||
            (commentFrames && ft == 'comment') ||
            (!commentFrames && ft == 'code');

        if (leaveAsIs) { 
            output += `${nl}${line}`;
            continue;
        }

        let fa = parseFrameArgs(line);
        if (fa.language == '--') 
            fa.language = undefined;

        output += 
              commentFrames ? `${nl}[${fa.language || '--'}]: # (`
            : fa.language ? `${nl}    \`\`\`${fa.language} {`
            : `${nl}    \`\`\``

        let comma = false;
        for(let key of Object.keys(fa)) {
            if (key == 'language')
                continue;
            comma ? output += ',' : comma = true;
            output += `${key}=${fa[key]}`;
        }

        output += 
              commentFrames ? ')' 
            : fa.language ? `}`
            : '';

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

// Traverse the groups.  Concatenate all setups and values 
// if it's a loging group.  Concatenate another setup for any 
// output group.  And then set any output group's value to 
// the results of the executed concatenated setup and codes. 
async function processCodeGroups (groups) {

    let processSetups = (setups) => {
        let concat = '';
        if (!setups)
            return '';
        if (!Array.isArray(setups))
            setups = [setups];
        for (let setup of setups) {
            let _setup = !setup.includes(':') 
                ? `${source}:${setup}`
                : setup;
            let [file,id] = _setup.split(':');
            concat += getGroupById(file, id).value + '\r\n'; 
        }
        return concat;
    }

    let setup = '';
    let code = '';

    for(let group of groups) 
        if (group.type == 'code' && group.frameArgs.log == 'true') {
            setup += processSetups(group.frameArgs.setup);
            code += group.value + '\r\n';
        }
        else if (group.type == 'code' && group.frameArgs.output == 'true') {
            setup += processSetups(group.frameArgs.setup);
            let output = await captureOutput(setup + code);
            let leadSpace = frameType(group.frameStarter) == 'code'
                ? group.frameStarter.match(/\s*/)
                : '    ';
            group.value = leadSpace + output.replace(/\n/g,'\n' + leadSpace); 
            setup = '';
            code = '';
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
    if(line.trim() == '```')
        return false;
    return  line.trim().startsWith('```') || // ```lang {...}
            line.trim().match(/^\[.+\]: # \(.+\)/); // [lang]: # (...)
}

function isFrameEnd (line) { 
    return  line.trim() == '```' || // ```
            line.trim().match(/^\[.+\]: # \(\)/); // [lang]: # ()
}

function frameType (line) {
    return line === undefined ? null
        :   line.trim().startsWith('```') ? 'code'
        //:   line.trim().endsWith('```') ? 'code'
        :   line.trim().match(/^\[.+\]: # \(/) ? 'comment' // [lang]: # (...
        :   null;
}

function parseFrameArgs (line) {
    
    let frameArgs = {};

    if (line.trim() == '```' || line.trim() == '[--]: # ()')
        return frameArgs;

    let language = line.trim().startsWith('```')
        ? line.match(/(?<=```).+?(?=\s)/g) // text between ``` and space
        : line.match(/(?<=\[).+?(?=\])/g); // text between []

    if(language)
        frameArgs.language = language.toString();

    let optionsMatch = line.trim().startsWith('```')
        ? line.match(/(?<=\{).+(?=\})/mg) // text between {}
        : line.match(/(?<=\().+(?=\))/mg); // text ()

    let optionValuePairs = 
        optionsMatch.toString()
        .replace(/(?<=\[.*),(?=.*])/g, '####')
        .split(',')
        .map(equality => {
            let [option, value] = equality.split('=');
            option = option.trim();
            value = value.trim();
            if (value.includes('####'))
                value = value.replace(/\[|]/g, '').split('####').map(val => val.trim());
            return { option, value }
        });

    for(let optionValuePair of optionValuePairs) {
        frameArgs[optionValuePair.option] = optionValuePair.value;        
    }

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
