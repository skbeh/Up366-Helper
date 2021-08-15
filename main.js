"use strict";

runtime.loadDex("./lib.dex");
importClass("org.anjson.anXML");
importClass("org.jsoup.Jsoup");

toast("请开启悬浮窗权限和无障碍服务，如已开启可无视");

let autoClick = confirm("是否自动做题？");
if (autoClick) {
    auto.waitFor();
    auto.setMode("fast");
}

function bookDetect(dir) {
    if (dir.length === 32) {
        return true;
    } else {
        return false;
    }
}


let modeInt = dialogs.select("选择模式", "练习模式", "考试模式", "其他");
let mode;
if (modeInt === -1) {
    throw new Error("未选择模式！");
} else if (modeInt === 0) {
    mode = "exercise";
} else if (modeInt === 1) {
    mode = "exam";
} else if (modeInt === 2) {
    mode = "other";
}

const BASE_PATH = files.getSdcardPath() + "/Up366Mobile/flipbook/flipbooks/";

function selectDialog(x, text) {
    if (x.length === 1) {
        return 0;
    } else if (x.length === 0) {
        throw new Error("无可选择项！");
    } else {
        return dialogs.select(text, x);
    }
}

let modeDir;
if (mode === "exercise") {
    modeDir = BASE_PATH + "2821FE6574D4930635501353FDD4A060" + '/';
} else if (mode === "exam") {
    modeDir = BASE_PATH + "D89A19AC7F27403202BDFE55E29C61AB" + '/';
} else if (mode === "other") {
    let modeDirList = files.listDir(BASE_PATH, bookDetect);
    modeDir = BASE_PATH + modeDirList[selectDialog(modeDirList, "选择模式")] + '/';
}

let bookList = files.listDir(modeDir, bookDetect);
const DIR_PATH = modeDir + bookList[selectDialog(bookList, "选择作业")] + '/';

function fileDetect(dirPath) {
    if (!files.exists(dirPath)) {
        throw new Error("文件夹不存在！");
    }
    const TYPES = ["page1.js", "correctAnswer.xml"];
    for (let type of TYPES) {
        const filePath = dirPath + '/' + type;
        if (files.exists(filePath)) {
            return filePath;
        }
    }
    const DIRS = [1, 2, 3];
    for (let dir of DIRS) {
        if (files.exists(dirPath + dir)) {
            dir = dialogs.select("子目录选择", dirs) + 1;
            filePath = dirPath + '/' + dir + '/' + "page1.js";
            return filePath;
        }
    }
    toast("未适配当前模式，开始模糊匹配！");
    const FILES_IN_DIR = files.listDir(dirPath);
    for (let answerFile of FILES_IN_DIR) {
        if (answerFile.endsWith(".js") || answerFile.endsWith(".xml")) {
            return dirPath + '/' + answerFile;
        }
    }
}

function JSONParse(text) {
    text = text.substring(15);
    return JSON.parse(text);
}

const FINAL_PATH = fileDetect(DIR_PATH);
let text = files.read(FINAL_PATH);
let answerObject;
if (files.getName(FINAL_PATH) === "page1.js") {
    answerObject = JSONParse(text);
} else if (files.getExtension(FINAL_PATH) === "xml") {
    answerObject = anXML.toJSONObject(text);
    answerObject = JSON.parse(answerObject.toString());
    answerObject = answerObject.elements;
}

function answers(answerText) {
    if (answerText === "A") {
        return 0;
    } else if (answerText === "B") {
        return 1;
    } else if (answerText === "C") {
        return 2;
    }
}

function answerTextProcess(value) {
    let answer = answers(value.answer_text);
    return value.options[answer].content;
}

const sectionProcess = value => value.slides.forEach(slideProcess);

function slideProcess(value) {
    if (value.answer_text) {
        console.log('');
        let answerContent = answerTextProcess(value);
        console.log(answerContent);
        options.push(answerContent);
    } else if (Object.prototype.hasOwnProperty.call(value, "questionList") || Object.prototype.hasOwnProperty.call(value, "questions_list")) {
        if (Array.isArray(value.questionList)) {
            if (value.questionList.length !== 0) {
                if (Array.isArray(value.questionList[0].questions_list)) {
                    const f = m => m.questions_list.forEach(questionProcess);
                    value.questionList.forEach(f);
                } else {
                    value.questionList.forEach(questionProcess);
                }
            }
        } else if (value.questions_list) {
            value.questions_list.forEach(questionProcess);
        }
    } else if (mode !== "exam" && value.analysis) {
        console.log('');
        console.log(tagclean(value.analysis));
    } else if (value.questionObj) {
        questionProcess(value.questionObj);
    }
}

function questionProcess(value) {
    if (Object.prototype.hasOwnProperty.call(value, "answer_text") && value.options[0]) {
        console.log('');
        let answerContent = answerTextProcess(value);
        console.log(answerContent);
        options.push(answerContent);
    } else if (Object.prototype.hasOwnProperty.call(value, "answers_list")) {
        value.answers_list.forEach(answerProcess);
    } else if (Object.prototype.hasOwnProperty.call(value, "questions_list")) {
        const questionPreSort = value => {
            if (value.answer_text) {
                console.log('');
                const answerContent = answerTextProcess(value);
                console.log(answerContent);
                options.push(answerContent);
            } else if (value.answers_list) {
                value.answers_list.forEach(answerProcess);
            }
        }
        value.questions_list.forEach(questionPreSort);
    } else if (value.answers) {
        if (Array.isArray(value.answers.answer)) {
            value.answers.answer.forEach(answerProcess);
        } else if (value.answers.answer instanceof Object) {
            answerProcess(value.answers.answer);
        }
    } else if (value.analysis) {
        console.log('');
        console.log(tagclean(value.analysis));
    }
}

function answerProcess(value) {
    let content = value.content;
    console.log(content);
    fills.push(content);
}

function tagclean(html) {
    let doc = Jsoup.parse(html, "text/html");
    let cleanedHTML = doc.getElementsByTag("p");
    if (cleanedHTML.text()) {
        return cleanedHTML.text();
    } else {
        return html;
    }
}

let options = [];
let fills = [];

if (answerObject.slides) {
    answerObject.slides.forEach(slideProcess);
} else if (answerObject.sliders) {
    answerObject.sliders.forEach(slideProcess);
} else if (answerObject.sections) {
    answerObject.sections.forEach(sectionProcess);
} else if (answerObject.practice) {
    answerObject.practice.forEach(slideProcess);
} else if (answerObject.element) {
    answerObject.element.forEach(questionProcess);
}

function selectOption(option) {
    const findOption = option => className("android.view.View").textEndsWith(option).findOnce();
    let optionButton = findOption(option);
    if (!optionButton) {
        option = option.trim();
        option = option.replace("  ", " ");
        optionButton = findOption(option);
    }
    if (optionButton) {
        optionButton.click();
    }
}

console.show();

if (autoClick) {
    if (currentPackage() !== "com.up366.mobile") {
        app.launchPackage("com.up366.mobile");
        sleep(150);
    }
    toast("请打开答题界面并点击“开始作答”！");
    waitForActivity("com.up366.mobile.book.StudyActivity");
    sleep(3500);
    let examButton = className("android.view.View").text("开始考试").findOnce();
    if (examButton) {
        examButton.click();
    } else {
        let examButton = className("android.view.View").text("继续作答").findOnce();
        if (examButton) {
            examButton.click();
        } else {
            let examButton = className("android.view.View").text("开始作答").findOnce();
            if (examButton) {
                examButton.click();
            }
        }
    }
    sleep(2000);
    options.forEach(selectOption);
    let i = 0;
    const fill = text => {
        let index = 2 * i + 1;
        i++;
        const optionButton = className("android.widget.EditText").editable(true).indexInParent(index).findOnce();
        if (optionButton) {
            const textEitherIndex = text.indexOf('/');
            if (textEitherIndex === -1) {
                optionButton.setText(text);
            } else {
                optionButton.setText(text.slice(0, textEitherIndex));
            }
        }
    }
    fills.forEach(fill);
}

console.log("\nfinished");
//