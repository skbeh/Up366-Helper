runtime.loadDex(files.getSdcardPath() + '/脚本/天学网/lib.dex');
importClass('org.anjson.anXML');
importClass('org.jsoup.Jsoup');

const options = [];
const fills = [];
const audios = {};

toast('请开启悬浮窗权限和无障碍服务，如已开启可无视');

const logFile = open(files.getSdcardPath() + '/up366/answer.txt', 'w');

const autoClick = confirm('是否自动做题？');
if (autoClick) {
    auto.waitFor();
    auto.setMode('fast');
}

function checkLog(string) {
    if (string) {
        const newLine = `${string}\n`;
        console.log(newLine);
        logFile.write(newLine);
    } else {
        console.log('Empty string\n');
    }
}

function bookDetect(dir) {
    return dir.length === 32;
}

const modeNumber = dialogs.select('选择模式', '练习模式', '考试模式', '其他');
const homeworkMode = (() => {
    switch (modeNumber) {
    case -1:
        throw RangeError('Mode not selected');
    case 0:
        return 'exercise';
    case 1:
        return 'exam';
    case 2:
        return 'other';
    default:
        throw RangeError('Mode value error');
    }
})();

// const basePath = files.getSdcardPath() + '/Android/data/com.up366.mobile/files/flipbook/';
const basePath = files.getSdcardPath() + '/up366/';

function selectDialog(array, text) {
    switch (array.length) {
    case 0:
        throw RangeError('Nothing to select');
    case 1:
        return 0;
    default:
        return dialogs.select(text, array);
    }
}

const modeDir = (() => {
    switch (homeworkMode) {
    case 'exercise':
        return `${basePath}2821FE6574D4930635501353FDD4A060/`;
    case 'exam':
        return `${basePath}D89A19AC7F27403202BDFE55E29C61AB/`;
    case 'other':
    {
        const modeDirList = files.listDir(basePath, bookDetect);
        return basePath + modeDirList[selectDialog(modeDirList, '选择模式')] + '/';
    }
    default:
        throw RangeError('Homework mode error');
    }
})();

const bookList = files.listDir(modeDir, bookDetect);
const dirPath = modeDir + bookList[selectDialog(bookList, '选择作业')] + '/';

function fileDetect(dirPath) {
    if (!files.exists(dirPath)) {
        throw RangeError('Directory not found');
    }
    const answerFileTypes = ['page1.js', 'correctAnswer.xml'];
    let filePath = '';
    if (answerFileTypes.some((type) => {
        filePath = dirPath + type;
        return files.exists(filePath) ? files.read(filePath).length > 1024 : false;
    })) {
        return filePath;
    }
    const dirCodeList = files.listDir(dirPath, (dirCode) => files.exists(`${dirPath}/${dirCode}/page1.js`));
    if (dirCodeList.length > 0) {
        return dirCodeList[dialogs.select('子目录选择', dirCodeList)];
    }

    toast('未适配当前模式，开始模糊匹配！');
    const filesInDirJava = files.listDir(dirPath);
    const filesInDir = filesInDirJava.map((file) => String(file));
    if (filesInDir.some((answerFile) => {
        filePath = dirPath + answerFile;
        return answerFile.endsWith('.js') || answerFile.endsWith('.xml');
    })) {
        return filePath;
    }
    throw Error('Answer file not found');
}

const JSONParse = (text) => JSON.parse(text.substring(15));

const finalPath = fileDetect(dirPath);
const unserializedText = files.read(finalPath);
const answerObject = (() => {
    switch (files.getExtension(finalPath)) {
    case 'js':
        return JSONParse(unserializedText);
    case 'xml':
        return JSON.parse(anXML.toJSONObject(unserializedText).toString()).elements;
    default:
        throw RangeError('Answer file extension error');
    }
})();

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
        throw RangeError('The option can not be a letter after D');
    }
}

function cleanTag(html, tag) {
    const doc = Jsoup.parse(html, 'text/html');
    if (tag) {
        return doc.getElementsByTag(tag).text();
    }
    let cleanedHTML = doc.getElementsByTag('p');
    if (cleanedHTML.text() && cleanedHTML.text() !== html) {
        return cleanedHTML.text();
    }
    cleanedHTML = doc.getElementsByTag('em');
    if (cleanedHTML.text()) {
        return cleanedHTML.text();
    }
    return html;
}

function answerTextProcess(value) {
    const answer = (() => {
        try {
            return optionToNumber(value.answer_text);
        } catch (error) {
            return error.toString();
        }
    })();
    if (value.options[answer]) {
        return value.options[answer].content;
    }
    if (value.record_speak[0]) {
        if (value.record_speak[0].content) {
            return value.record_speak[0].content;
        }
        return 'Value error';
    }
    return 'No value';
}

function answerProcess(value) {
    checkLog(value.content);
    fills.push(value.content);
}

function questionProcess(value) {
    if (Object.prototype.hasOwnProperty.call(value, 'answer_text') && value.options[0]) {
        const answerContent = answerTextProcess(value);
        checkLog(answerContent);
        options.push(answerContent);
    } else if (Object.prototype.hasOwnProperty.call(value, 'answers_list')) {
        value.answers_list.forEach(answerProcess);
    } else if (Object.prototype.hasOwnProperty.call(value, 'questions_list')) {
        const questionPreSort = (value) => {
            if (value.answer_text) {
                const answerContent = answerTextProcess(value);
                checkLog(answerContent);
                options.push(answerContent);
            } else if (value.answers_list) {
                value.answers_list.forEach(answerProcess);
            }
        };
        value.questions_list.forEach(questionPreSort);
    } else if (value.answers) {
        if (Array.isArray(value.answers.answer)) {
            value.answers.answer.forEach(answerProcess);
        } else if (value.answers.answer instanceof Object) {
            answerProcess(value.answers.answer);
        }
    } else if (value.analysis) {
        checkLog(cleanTag(value.analysis));
    } else if (value.question_no) {
        const audioFile = dirPath + Jsoup.parse(value.question_text, 'text/html').getElementsByAttribute('has_audio').attr('url');
        audios[value.question_no] = audioFile;
    }
}

function slideProcess(value) {
    if (value.answer_text) {
        const answerContent = answerTextProcess(value);
        checkLog(answerContent);
        options.push(answerContent);
    } else if (Object.prototype.hasOwnProperty.call(value, 'questionList') || Object.prototype.hasOwnProperty.call(value, 'questions_list')) {
        if (Array.isArray(value.questionList)) {
            if (value.questionList.length !== 0) {
                if (Array.isArray(value.questionList[0].questions_list)) {
                    value.questionList.forEach((part) => part.questions_list.forEach(questionProcess));
                } else {
                    value.questionList.forEach(questionProcess);
                }
            }
        } else if (value.questions_list) {
            value.questions_list.forEach(questionProcess);
        }
    } else if (homeworkMode !== 'exam' && value.analysis) {
        checkLog(cleanTag(value.analysis));
    } else if (value.questionObj) {
        questionProcess(value.questionObj);
    }
}

const sectionProcess = (value) => value.slides.forEach(slideProcess);

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
    const findOption = (option) => className('android.widget.TextView').textContains(option).findOnce();
    let optionButton = findOption(option);
    if (optionButton) {
        optionButton.click();
    } else {
        optionButton = findOption(option.trim().replace('  ', ' '));
        if (optionButton) {
            optionButton.click();
        } else {
            optionButton = findOption(cleanTag(option));
            if (optionButton) {
                optionButton.click();
            }
        }
    }
}

console.show();

if (autoClick) {
    if (currentPackage() !== 'com.up366.mobile') {
        app.launchPackage('com.up366.mobile');
        sleep(150);
    }
    toast('请打开答题界面并点击“开始作答”！');
    waitForActivity('com.up366.mobile.book.StudyActivity');
    sleep(3500);
    let examButton = className('android.widget.TextView').text('开始考试').findOnce();
    if (examButton) {
        examButton.click();
        examButton = className('android.widget.TextView').text('开始作答').findOnce();
        if (examButton) {
            examButton.click();
        }
    } else {
        examButton = className('android.widget.TextView').text('继续作答').findOnce();
        if (examButton) {
            examButton.click();
        } else {
            examButton = className('android.widget.TextView').text('开始作答').findOnce();
            if (examButton) {
                examButton.click();
            }
        }
    }
    sleep(2000);
    options.forEach(selectOption);
    let i = 0;
    const fill = (text) => {
        const index = 2 * i + 1;
        i += 1;
        const optionButton = className('android.widget.EditText').editable(true).indexInParent(index).findOnce();
        if (optionButton) {
            const textEitherIndex = text.indexOf('/');
            if (textEitherIndex === -1) {
                optionButton.setText(text);
            } else {
                optionButton.setText(text.slice(0, textEitherIndex));
            }
        }
    };
    const playAudio = (audioNumber) => {
        className('android.webkit.WebView').text('校本作答页面').findOnce().child(0)
            .child(0)
            .find(clickable(true))[1].click();
        className('android.widget.TextView').clickable(true).text(audioNumber).findOne()
            .click();
        const playView = className('android.widget.TextView').clickable(false).text(audioNumber).findOne()
            .parent()
            .parent()
            .parent()
            .child(2);
        const playButton = playView.findOne(text('点击录音')).parent().child(1);
        do {
            playButton.click();
            sleep(100);
        } while (className('android.widget.TextView').text('上一段音频正在评分中，请稍候').findOnce());
        media.playMusic(audios[audioNumber]);
        sleep(media.getMusicDuration());
        playView.child(3).child(2).click();
    };
    fills.forEach(fill);
    Object.keys(audios).forEach(playAudio);
}

logFile.close();

console.log('\nfinished');
//
