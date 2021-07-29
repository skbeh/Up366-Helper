"use strict";

runtime.loadDex("./lib.dex");
//delete XML;
importClass("org.anjson.anXML");
importClass("org.jsoup.Jsoup");

toast("请开启悬浮窗权限和无障碍服务，如已开启可无视");

let i;
i = confirm("是否自动做题？");
if (i) {
    var autoClick = true;
    auto.waitFor();
    auto.setMode("fast");
} else {
    var autoClick = false;
}

function bookDetect(dir) {
    if (dir.length === 32) {
        return true;
    } else {
        return false;
    }
}


i = dialogs.select("选择模式", "练习模式", "考试模式", "其他");
let mode;
if (i === -1) {
    exit();
} else if (i === 0) {
    mode = "exercise";
} else if (i === 1) {
    mode = "exam";
} else if (i === 2) {
    mode = "other";
}

const path0 = files.getSdcardPath() + "/Up366Mobile/flipbook/flipbooks/";

function selectDialog(i, text) {
    if (i.length !== 1) {
        return dialogs.select(text, i);
    } else {
        return 0;
    }
}

let modeDir;
if (mode === "exercise") {
    modeDir = path0 + "2821FE6574D4930635501353FDD4A060" + "/";
} else if (mode === "exam") {
    modeDir = path0 + "D89A19AC7F27403202BDFE55E29C61AB" + "/";
} else if (mode === "other") {
    i = files.listDir(path0, bookDetect);
    modeDir = path0 + i[selectDialog(i, "选择模式")] + "/";
}

i = files.listDir(modeDir, bookDetect);
const dirPath = modeDir + i[selectDialog(i, "选择作业")];

function fileDetect(dirPath) {
    const types = ["page1.js", "correctAnswer.xml"];
    let type;
    let filePath;
    for (type in types) {
        filePath = dirPath + "/" + types[type];
        //console.show();
        if (files.exists(filePath)) {
            return filePath;
        }
    }
    const dirs = [1, 2, 3];
    let dir;
    for (dir in dirs) {
        if (files.exists(dirPath)) {
            dir = dialogs.select("子目录选择", dirs) + 1;
            filePath = dirPath + "/" + dir + "/" + "page1.js";
            return filePath;
        }
    }
    toast("未适配当前模式，开始模糊匹配！");
    const filesInDir = files.listDir(dirPath);
    let answerFile;
    for (answerFile in dirPath) {
        if (answerFile.endsWith(".js") || answerFile.endsWith(".xml")) {
            return dirPath + "/" + answerFile;
        }
    }
}

function JSONParse(text) {
    //const path = modeDir + i[selectDialog(i, "选择作业")] + "/page1.js";
    //print(path);
    text = text.substring(15);
    return JSON.parse(text);
}

const finalPath = fileDetect(dirPath);
let text = files.read(finalPath);
var obj;
if (files.getName(finalPath) === "page1.js") {
    obj = JSONParse(text);
} else if (files.getExtension(finalPath) === "xml") {
    obj = anXML.toJSONObject(text);
    obj = JSON.parse(obj.toString());
    obj = obj.elements;
    //print(obj);
}

function answers(answer_text) {
    if (answer_text === "A") {
        return 0;
    } else if (answer_text === "B") {
        return 1;
    } else if (answer_text === "C") {
        return 2;
    }
}

function answerTextProcess(value) {
    let answer = answers(value.answer_text);
    return value.options[answer].content;
}

const sectionProcess = value => value.slides.forEach(slideProcess);
console.show();

function slideProcess(value) {
    if (value.answer_text) {
        print('');
        let answerContent = answerTextProcess(value);
        print(answerContent);
        options.push(answerContent);
    } else if (value.hasOwnProperty("questionList") || value.hasOwnProperty("questions_list")) {
        if (Array.isArray(value.questionList)) {
            if (value.questionList.length !== 0) {
                if (Array.isArray(value.questionList[0].questions_list)) {
                    const m = n => n.questions_list.forEach(questionProcess);
                    value.questionList.forEach(m);
                } else {
                    value.questionList.forEach(questionProcess);
                }
            }
        } else if (value.questions_list) {
            //print(value);
            value.questions_list.forEach(questionProcess);
        }
    } else if (mode !== "exam" && value.analysis) {
        print('');
        print(tagclean(value.analysis));
    } else if (value.questionObj) {
        questionProcess(value.questionObj);
    }
}

function questionProcess(value) {
    if (value.hasOwnProperty("answer_text") && value.options[0]) {
        print('');
        let answerContent = answerTextProcess(value);
        print(answerContent);
        options.push(answerContent);
    } else if (value.hasOwnProperty("answers_list")) {
        value.answers_list.forEach(answerProcess);
    } else if (value.hasOwnProperty("questions_list")) {
        const f = function(value) {
            if (value.answer_text) {
                print('');
                let answerContent = answerTextProcess(value);
                print(answerContent);
                options.push(answerContent);
            } else if (value.answers_list) {
                value.answers_list.forEach(answerProcess);
            }
        }
        value.questions_list.forEach(f);
    } else if (value.answers) {
        if (Array.isArray(value.answers.answer)) {
            value.answers.answer.forEach(answerProcess);
        } else if (Object.prototype.toString.call(value.answers.answer) === "[object Object]") {
            answerProcess(value.answers.answer);
        }
    } else if (value.analysis) {
        print('');
        print(tagclean(value.analysis));
    }
}

function answerProcess(value) {
    i = value.content;
    print(i);
    fills.push(i);
}

function tagclean(i) {
    let doc = Jsoup.parse(i, "text/html");
    let x = doc.getElementsByTag("p");
    if (x.text()) {
        return x.text();
    } else {
        return i;
    }
}

var options = [];
var fills = [];

if (obj.slides) {
    obj.slides.forEach(slideProcess);
} else if (obj.sliders) {
    obj.sliders.forEach(slideProcess);
} else if (obj.sections) {
    obj.sections.forEach(sectionProcess);
} else if (obj.practice) {
    obj.practice.forEach(slideProcess);
} else if (obj.element) {
    obj.element.forEach(questionProcess);
}

function selectOption(option) {
    const y = option => className("android.view.View").textEndsWith(option).findOnce();
    i = y(option);
    if (!i) {
        option = option.trim();
        option = option.replace("  ", " ");
        i = y(option);
    }
    if (i) {
        i.click();
    }
}

//print(options);
//print(fills);

console.show();

if (autoClick) {
    if (currentPackage() !== "com.up366.mobile") {
        app.launchPackage("com.up366.mobile");
        sleep(150);
    }
    toast("请打开答题界面并点击“开始作答”！");
    waitForActivity("com.up366.mobile.book.StudyActivity");
    sleep(3500);
    i = className("android.view.View").text("开始考试").findOnce();
    if (i) {
        i.click();
    } else {
        i = className("android.view.View").text("继续作答").findOnce();
        if (i) {
            i.click();
        } else {
            i = className("android.view.View").text("开始作答").findOnce();
            if (i) {
                i.click();
            }
        }
    }
    sleep(2000);
    options.forEach(selectOption);
    let a = 0;
    const fill = text => {
        let b = 2 * a + 1;
        i = className("android.widget.EditText").editable(true).indexInParent(b).findOnce();
        a++;
        if (i) {
            let x = text.indexOf('/');
            if (x === -1) {
                i.setText(text);
            } else {
                i.setText(text.slice(0, x));
            }
        }
    }
    fills.forEach(fill);
}

print("finished");
//nt("finished");
//nished");
//