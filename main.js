"use strict";

runtime.loadDex("./lib.dex");
importClass("org.anjson.anXML");
importClass("org.jsoup.Jsoup");

toast("请开启悬浮窗权限和无障碍服务，如已开启可无视");

const autoClick = confirm("是否自动做题？");
if (autoClick) {
    auto.waitFor();
    auto.setMode("fast");
}

function checkLog(string) {
    if (string) {
        console.log(string + "\n");
    } else {
        console.log("Empty string!\n");
    }
}

function bookDetect(dir) {
    if (dir.length === 32) {
        return true;
    } else {
        return false;
    }
}


const modeNumber = dialogs.select("选择模式", "练习模式", "考试模式", "其他");
const homeworkMode = (modeNumber => {
    switch (modeNumber) {
        case -1:
            throw new Error("Mode not selected!");
        case 0:
            return "exercise";
            break;
        case 1:
            return "exam";
            break;
        case 2:
            return "other";
            break;
        default:
            throw new Error("Mode value error!");
    }
})(modeNumber);

const BASE_PATH = files.getSdcardPath() + "/Up366Mobile/flipbook/flipbooks/";

function selectDialog(x, text) {
    switch (x.length) {
        case 0:
            throw new Error("Nothing to select!");
        case 1:
            return 0;
        default:
            return dialogs.select(text, x);
    }
}

const modeDir = (homeworkMode => {
    switch (homeworkMode) {
        case "exercise":
            return BASE_PATH + "2821FE6574D4930635501353FDD4A060" + '/';
        case "exam":
            return BASE_PATH + "D89A19AC7F27403202BDFE55E29C61AB" + '/';
        case "other":
            const modeDirList = files.listDir(BASE_PATH, bookDetect);
            return BASE_PATH + modeDirList[selectDialog(modeDirList, "选择模式")] + '/';
    }
})(homeworkMode)

const bookList = files.listDir(modeDir, bookDetect);
const dirPath = modeDir + bookList[selectDialog(bookList, "选择作业")] + '/';

function fileDetect(dirPath) {
    if (!files.exists(dirPath)) {
        throw new Error("Directory not found!");
    }
    const TYPES = ["page1.js", "correctAnswer.xml"];
    for (let type of TYPES) {
        let filePath = dirPath + type;
        if (files.exists(filePath)) {
            return filePath;
        }
    }
    const DIRS = [1, 2, 3];
    for (let dir of DIRS) {
        if (files.exists(dirPath + dir)) {
            dir = dialogs.select("子目录选择", DIRS) + 1;
            let filePath = dirPath + dir + '/' + "page1.js";
            return filePath;
        }
    }
    toast("未适配当前模式，开始模糊匹配！");
    const filesInDirJava = files.listDir(dirPath);
    const filesInDir = filesInDirJava.map(file => String(file));
    for (let answerFile of filesInDir) {
        if (answerFile.endsWith(".js") || answerFile.endsWith(".xml")) {
            return dirPath + answerFile;
        }
    }

}


function JSONParse(text) {
    text = text.substring(15);
    return JSON.parse(text);
}

const finalPath = fileDetect(dirPath);
const unserializedText = files.read(finalPath);
const answerObject = ((unserializedText) => {
    switch (files.getExtension(finalPath)) {
        case "js":
            return JSONParse(unserializedText);
        case "xml":
            const XMLObject = anXML.toJSONObject(unserializedText);
            return JSON.parse(XMLObject.toString()).elements;
    }
})(unserializedText);

function optionToNumber(answerText) {
    switch (answerText) {
        case 'A':
            return 0;
        case 'B':
            return 1;
        case 'C':
            return 2;
        case 'D':
            return 3;
        default:
            throw new Error("The option can't be a letter after D!");
    }
}

function answerTextProcess(value) {
    try {
        const answer = optionToNumber(value.answer_text);
    } catch (error) {
        console.log(error);
    }
    if (value.options[answer]) {
        return value.options[answer].content;
    } else if (value.record_speak[0]) {
        if (value.record_speak[0].content) {
            return value.record_speak[0].content
        } else {
            return "Value error"
        }
    } else {
        return 'No value';
    }
}

const sectionProcess = value => value.slides.forEach(slideProcess);

function slideProcess(value) {
    if (value.answer_text) {
        const answerContent = answerTextProcess(value);
        checkLog(answerContent);
        options.push(answerContent);
    } else if (Object.prototype.hasOwnProperty.call(value, "questionList") || Object.prototype.hasOwnProperty.call(value, "questions_list")) {
        if (Array.isArray(value.questionList)) {
            if (value.questionList.length !== 0) {
                if (Array.isArray(value.questionList[0].questions_list)) {
                    value.questionList.forEach(part => part.questions_list.forEach(questionProcess));
                } else {
                    value.questionList.forEach(questionProcess);
                }
            }
        } else if (value.questions_list) {
            value.questions_list.forEach(questionProcess);
        }
    } else if (homeworkMode !== "exam" && value.analysis) {
        checkLog(tagclean(value.analysis));
    } else if (value.questionObj) {
        questionProcess(value.questionObj);
    }
}

function questionProcess(value) {
    if (Object.prototype.hasOwnProperty.call(value, "answer_text") && value.options[0]) {
        const answerContent = answerTextProcess(value);
        checkLog(answerContent);
        options.push(answerContent);
    } else if (Object.prototype.hasOwnProperty.call(value, "answers_list")) {
        value.answers_list.forEach(answerProcess);
    } else if (Object.prototype.hasOwnProperty.call(value, "questions_list")) {
        const questionPreSort = value => {
            if (value.answer_text) {
                const answerContent = answerTextProcess(value);
                checkLog(answerContent);
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
        checkLog(tagclean(value.analysis));
    }
}

function answerProcess(value) {
    checkLog(value.content);
    fills.push(value.content);
}

function tagclean(html) {
    const doc = Jsoup.parse(html, "text/html");
    const cleanedHTML = doc.getElementsByTag("p");
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
//;
//