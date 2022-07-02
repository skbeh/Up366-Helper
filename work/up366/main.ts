"use strict";
import {
  AnswerPage,
  QuestionList,
  AnswersList,
  Questions,
  Section,
  Slide,
} from "./answerPage";
import { Convert } from "./convert";

const DEBUG: boolean = true;

const SDCARD_PATH: string = files.getSdcardPath();

if (DEBUG) {
  runtime.loadDex(`${SDCARD_PATH}/Scripts/up366/dependencies/lib.dex`);
} else {
  runtime.loadDex("dependencies/lib.dex");
}
importClass("org.anjson.anXML");
declare const anXML: any;
importClass("org.jsoup.Jsoup");
declare const Jsoup: any;

enum HomeworkMode {
  others = "其他",
  exercise = "练习模式",
  exam = "考试模式",
}

export interface AnswerOption {
  [index: string]: string;
}

const OptionArray: string[] = [];
const FillArray: string[] = [];
const AudioMap: Map<number, string> = new Map();

let LogFile: com.stardust.pio.PWritableTextFile;

function intersection<T>(array1: Array<T>, array2: Array<T>): Array<T> {
  const set = new Set(array2);
  const intersectionSet = new Set(array1.filter((elem) => set.has(elem)));
  return Array.from(intersectionSet);
}

function questionOrQuestionsProcess(value: Questions | QuestionList): void {
  if (
    intersection(["answerText", "questionsList"], Object.keys(value)).length
  ) {
    questionProcess(value);
  } else if (
    intersection(
      ["answersList", "answers", "analysis", "questionNo"],
      Object.keys(value)
    ).length
  ) {
    questionsProcess(value);
  } else {
    questionCommonProcess(value);
  }
}

function checkLog(string: string): void {
  if (string) {
    const newLine = `${string}\n`;
    console.log(newLine);
    LogFile.write(newLine);
  } else {
    console.log("Empty string\n");
  }
}

function bookDetect(dir: string): boolean {
  return dir.length === 32;
}

function selectDialog(array: string[], text: string): number {
  switch (array.length) {
    case 0:
      throw RangeError("Nothing to select");
    case 1:
      return 0;
    default:
      return dialogs.select(text, array) as number;
  }
}

function homeworkModeToDir(
  homeworkMode: HomeworkMode,
  basePath: string
): string {
  switch (homeworkMode) {
    case HomeworkMode.exercise:
      return `${basePath}2821FE6574D4930635501353FDD4A060/`;
    case HomeworkMode.exam:
      return `${basePath}D89A19AC7F27403202BDFE55E29C61AB/`;
    case HomeworkMode.others: {
      const modeDirList: string[] = files.listDir(
        basePath,
        bookDetect as unknown as com.stardust.util.Func1<string, boolean>
      );
      return `${
        basePath + modeDirList[selectDialog(modeDirList, "选择模式")]
      }/`;
    }
    default:
      throw RangeError("Homework mode error");
  }
}

function fileDetect(dirPath: string): string {
  if (!files.exists(dirPath)) {
    throw RangeError("Directory not found");
  }

  const answerFileTypes: string[] = [
    "page1.js",
    "paper.xml",
    "correctAnswer.xml",
  ];
  for (const type of answerFileTypes) {
    const filePath: string = dirPath + type;
    if (files.exists(filePath)) {
      const file: number[] = files.readBytes(filePath);
      if (file.length > 1024) {
        return filePath;
      }
    }
  }

  const dirCodeList: string[] = files.listDir(dirPath, ((dirCode: string) =>
    files.exists(
      `${dirPath}/${dirCode}/page1.js`
    )) as unknown as com.stardust.util.Func1<string, boolean>);
  if (dirCodeList.length > 0) {
    return dirCodeList[dialogs.select("子目录选择", dirCodeList) as number];
  }

  toast("开始模糊匹配！");
  const filesInDirJava = files.listDir(dirPath);
  const filesInDir = filesInDirJava.map((file) => String(file));
  const potentialAnswerFiles: Array<string> = filesInDir.filter(
    (answerFile) => {
      return answerFile.endsWith(".js") || answerFile.endsWith(".xml");
    }
  );
  if (potentialAnswerFiles.length) {
    return potentialAnswerFiles[0];
  }

  throw Error("No answer file found");
}

const JSONParse: (text: string) => AnswerPage = (text) =>
  Convert.toAnswerPage(text.substring(15));

function optionToNumber(answerText: string) {
  switch (answerText) {
    case "A":
      return 0;
    case "B":
      return 1;
    case "C":
      return 2;
    case "D":
      return 3;
    default:
      const message: string = `${answerText} is not a valid option`;
      if (DEBUG) {
        throw RangeError(message);
      }
      console.log(message);
      return -1;
  }
}

function cleanTag(html: string, tag?: string): string {
  const doc = Jsoup.parse(html, "text/html");
  if (tag) {
    return doc.getElementsByTag(tag).text();
  }
  let cleanedHTML = doc.getElementsByTag("p");
  if (cleanedHTML.text() && cleanedHTML.text() !== html) {
    return cleanedHTML.text();
  }
  cleanedHTML = doc.getElementsByTag("em");
  if (cleanedHTML.text()) {
    return cleanedHTML.text();
  }
  return html.trim();
}

function questionListProcess(value: QuestionList): string {
  if (value.answerText && value.answerText !== "<answers/>") {
    const answerIndex = optionToNumber(value.answerText);
    if (
      answerIndex >= 0 &&
      Array.isArray(value.options) &&
      value.options[answerIndex].content
    ) {
      return value.options[answerIndex].content!;
    }
  }

  if (Array.isArray(value.recordSpeak) && value.recordSpeak[0]) {
    return value.recordSpeak[0].content
      ? value.recordSpeak[0].content
      : "Value is empty";
  }
  return "No Value";
}

function answerProcess(value: AnswersList): void {
  if (value.content) {
    checkLog(value.content);
    FillArray.push(value.content);
  } else {
    console.log("No content");
  }
}

function questionCommonProcess(value: QuestionList | Questions): void {
  if (value.answersList) {
    value.answersList.forEach(answerProcess);
  } else if (value.analysis) {
    checkLog(cleanTag(value.analysis));
    if (
      "recordSpeak" in value &&
      Array.isArray(value.recordSpeak) &&
      value.recordSpeak[0].content &&
      value.recordSpeak[0].content.length !== value.analysis.length
    ) {
      checkLog(value.recordSpeak[0].content);
    }
  } else if (value.questionNo) {
    const audioFile = Jsoup.parse(value.questionText, "text/html")
      .getElementsByAttribute("has_audio")
      .attr("url");
    AudioMap.set(parseInt(value.questionNo, 10), audioFile);
  }
}

function questionProcess(value: QuestionList): void {
  if (value.answerText && Array.isArray(value.options) && value.options[0]) {
    const answerContent = questionListProcess(value);
    checkLog(answerContent);
    OptionArray.push(answerContent);
  } else if (value.questionsList) {
    const questionPreSort = (value: {
      answerText?: string;
      answersList?: AnswersList[];
    }) => {
      if (value.answerText) {
        const answerContent = questionListProcess(value);
        checkLog(answerContent);
        OptionArray.push(answerContent);
      } else if (value.answersList) {
        value.answersList.forEach(answerProcess);
      }
    };
    value.questionsList.forEach(questionPreSort);
  } else {
    questionCommonProcess(value);
  }
}

function questionsProcess(value: Questions): void {
  if (Array.isArray(value.answersList)) {
    value.answersList.forEach(answerProcess);
  } else if (value.answers && "answer" in value.answers) {
    if (Array.isArray(value.answers.answer)) {
      value.answers.answer.forEach(answerProcess);
    } else if (value.answers.answer) {
      answerProcess(value.answers.answer);
    }
  } else {
    questionCommonProcess(value);
  }
}

function audioProcess(
  audioNumber: number,
  path: string,
  dirPath: string
): void {
  try {
    media.playMusic(dirPath + path);
  } catch (error) {
    console.log(error);
    const audioFileArray = files.listDir(
      dirPath,

      ((fileName: string) =>
        fileName === files.getName(path)) as unknown as com.stardust.util.Func1<
        string,
        boolean
      >
    );
    if (audioFileArray.length !== 0) {
      media.playMusic(audioFileArray[0]);
    }
  }
  media.pauseMusic();

  className("android.webkit.WebView")
    .text("校本作答页面")
    .findOnce()
    .child(0)
    .child(0)
    .find(clickable(true))[1]
    .click();
  className("android.widget.TextView")
    .clickable(true)
    .text(audioNumber.toFixed(0))
    .findOne()
    .click();
  const playView = className("android.widget.TextView")
    .clickable(false)
    .text(audioNumber.toFixed(0))
    .findOne()
    .parent()
    .parent()
    .parent()
    .child(2);
  const playButton = playView.findOne(text("点击录音")).parent().child(1);

  const isRecordEnded = (): boolean =>
    className("android.widget.TextView")
      .textStartsWith("录音中 00:0")
      .find()
      .filter((textView) => {
        const time = parseInt(textView.text().slice(-1), 10);
        return time > 0;
      }).length === 0;
  for (let ended: boolean = false; ; sleep(50)) {
    if (!ended && !isRecordEnded()) {
      sleep(500);
    }
    ended = isRecordEnded();

    playButton.click();
    if (
      className("android.widget.TextView")
        .text("上一段音频正在评分中，请稍候")
        .findOne(1000)
    ) {
      sleep(100);
    } else if (ended) {
      break;
    }
  }

  media.musicSeekTo(50);
  media.resumeMusic();
  sleep(media.getMusicDuration() - 250);
  media.stopMusic();

  const stopButtonParent = (() => {
    while (!playView.child(3));
    return playView.child(3);
  })();
  const stopButton = (() => {
    while (!stopButtonParent.child(2));
    return stopButtonParent.child(2);
  })();
  stopButton.click();
}

function slideProcess(value: Slide) {
  if (value.answerText) {
    const answerContent = questionListProcess(value);
    checkLog(answerContent);
    OptionArray.push(answerContent);
  } else if (value.questionList || value.questionsList) {
    if (Array.isArray(value.questionList)) {
      if (value.questionList.length !== 0) {
        if (Array.isArray(value.questionList[0].questionsList)) {
          value.questionList.forEach(
            (part: { questionsList?: Questions[] }) => {
              if (Array.isArray(part.questionsList)) {
                part.questionsList.forEach(questionOrQuestionsProcess);
              }
            }
          );
        } else {
          value.questionList.forEach(questionOrQuestionsProcess);
        }
      }
    } else if (value.questionsList) {
      value.questionsList.forEach(questionOrQuestionsProcess);
    }
  } else if (value.analysis) {
    checkLog(cleanTag(value.analysis));
  } else if (value.questionObj) {
    questionOrQuestionsProcess(value.questionObj);
  }
}

const sectionProcess = (value: Section) => value.slides!.forEach(slideProcess);

function selectOption(option: string) {
  const findOption = (option: string) =>
    className("android.widget.TextView").textContains(option).findOnce();
  let optionButton = findOption(option);
  if (optionButton) {
    optionButton.click();
  } else {
    optionButton = findOption(option.trim().replace("  ", " "));
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

function main(): void {
  const basePath =
    device.sdkInt >= 29
      ? `${SDCARD_PATH}/up366/`
      : `${SDCARD_PATH}/Android/data/com.up366.mobile/files/flipbook/`;

  const modeNumber = dialogs.select(
    "选择模式",
    HomeworkMode.others,
    HomeworkMode.exercise,
    HomeworkMode.exam
  );
  const homeworkMode: HomeworkMode = (() => {
    switch (modeNumber) {
      case -1:
        throw RangeError("Mode not selected");
      case 0:
        return HomeworkMode.others;
      case 1:
        return HomeworkMode.exercise;
      case 2:
        return HomeworkMode.exam;
      default:
        throw RangeError("Mode value error");
    }
  })();

  toast("请开启悬浮窗权限和无障碍服务，如已开启可无视");

  LogFile = open(`${SDCARD_PATH}/up366/answer.txt`, "w");

  const autoClick = confirm("是否自动做题？");
  if (autoClick) {
    auto.waitFor();
  }

  const modeDir = homeworkModeToDir(homeworkMode, basePath);

  const bookList = files.listDir(
    modeDir,
    bookDetect as unknown as com.stardust.util.Func1<string, boolean>
  );
  const dirPath = `${modeDir + bookList[selectDialog(bookList, "选择作业")]}/`;

  const finalPath = fileDetect(dirPath);
  const rawText = files.read(finalPath);
  const answerObject = (() => {
    switch (files.getExtension(finalPath)) {
      case "js":
        return JSONParse(rawText);
      case "xml":
        return Convert.objectToAnswerPage(
          JSON.parse(anXML.toJSONObject(rawText).toString()).elements
        );
      default:
        throw RangeError("Answer file extension error");
    }
  })();

  if (answerObject.slides) {
    answerObject.slides.forEach(slideProcess);
  } else if (answerObject.sliders) {
    answerObject.sliders.forEach(slideProcess);
  } else if (answerObject.sections) {
    if (answerObject.sections[0] && "slides" in answerObject.sections[0]) {
      (answerObject.sections as Section[]).forEach(sectionProcess);
    } else {
      (answerObject.sections as Slide[]).forEach(slideProcess);
    }
  } else if (answerObject.practice) {
    answerObject.practice.forEach(slideProcess);
  } else if (answerObject.element) {
    answerObject.element.forEach(questionOrQuestionsProcess);
  }

  (console as unknown as Internal.Console).show();

  if (autoClick) {
    if (currentPackage() !== "com.up366.mobile") {
      app.launchPackage("com.up366.mobile");
    }

    toast("请打开答题界面并点击“开始作答”！");
    waitForActivity("com.up366.mobile.book.StudyActivity");
    sleep(3500);

    let examButton = className("android.widget.TextView")
      .text("开始考试")
      .findOnce();
    if (examButton) {
      examButton.click();
      examButton = className("android.widget.TextView")
        .text("开始作答")
        .findOnce();
      if (examButton) {
        examButton.click();
      }
    } else {
      examButton = className("android.widget.TextView")
        .text("继续作答")
        .findOnce();
      if (examButton) {
        examButton.click();
      } else {
        examButton = className("android.widget.TextView")
          .text("开始作答")
          .findOnce();
        if (examButton) {
          examButton.click();
        }
      }
    }

    sleep(1500);
    OptionArray.forEach(selectOption);

    const fill = (_: number, text: string, currentIndex: number): number => {
      const index: number = currentIndex * 2 + 1;
      const optionButton = className("android.widget.EditText")
        .editable(true)
        .indexInParent(index)
        .findOnce();
      if (optionButton) {
        const textEitherIndex = text.indexOf("/");
        if (textEitherIndex === -1) {
          optionButton.setText(text);
        } else {
          optionButton.setText(text.slice(0, textEitherIndex));
        }
      }
      return 0;
    };

    FillArray.reduce(fill, 0);

    for (const [audio, path] of AudioMap.entries()) {
      audioProcess(audio, path, dirPath);
    }
  }

  LogFile.close();
  console.log("\nfinished");
}

main();
