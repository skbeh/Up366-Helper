// To parse this data:
//
//   import { Convert, AnswerPage } from "./answerPage";
//
//   const answerPage = Convert.toAnswerPage(json);

export interface AnswerPage {
  isExam?: Is;
  isShowPartBQuesTitle?: Is;
  isShowPartCQuesTable?: Is;
  isCanRetry?: Is;
  isShowCustomQuesNumber?: Is;
  examTitle?: string;
  examDescription?: string;
  slides?: Slide[];
  mediaRes?: string;
  pageElement?: PageElement;
  taskObj?: TaskObj;
  pageNum?: number;
  dirD?: string;
  pageID?: string;
  practice?: Slide[];
  element?: Questions[];
  sliders?: Slide[];
  sections?: Section[] | Slide[];
}

export enum Is {
  Empty = "",
  Y = "Y",
}

export interface PageElement {
  elementID?: string;
  elementType?: number;
}

export interface Section {
  slides?: Slide[];
}

export interface Slide {
  title?: string;
  description?: string;
  displayType?: string;
  questionList?: QuestionList[];
  specialAnswers?: string;
  specialAnswerScore?: string;
  flowConfig?: string;
  videoName?: string;
  isRandom?: string;
  isShowRepeat?: Is;
  isShowPartAQuestionText?: string;
  curQuestionNum?: string;
  questionsList?: Questions[] | QuestionList[];
  analysis?: string;
  questionObj?: Questions | QuestionList;
  answerText?: string;
}

export interface QuestionList {
  qtypeID?: number;
  questionType?: number;
  elementID?: string;
  elementType?: number;
  media?: Media;
  analysis?: string;
  questionID?: string;
  questionText?: string;
  medias?: Media[];
  options?: Option[];
  recordFollowRead?: RecordFollowRead;
  questionScore?: number;
  questionsList?: Questions[];
  knowledge?: string;
  answerText?: string;
  recordSpeak?: RecordSpeak[];
  questionNo?: string;
  answersList?: AnswersList[];
}

export interface Media {
  file?: string;
  type?: Type;
}

export enum Type {
  Audio = "audio",
  Media = "media",
}

export interface AnswersWithAnswer {
  answer?: AnswersList | AnswersList[];
}

export interface Questions {
  questionText?: string;
  answersList?: AnswersList[];
  medias?: any[];
  qtypeID?: number;
  questionType?: number;
  options?: Option[];
  elementID?: string;
  elementType?: number;
  questionScore?: number;
  analysis?: string;
  questionID?: string;
  knowledge?: string;
  answers?: AnswersList[] | AnswersWithAnswer;
  questionNo?: string;
  answerText?:string;
}

export interface AnswersList {
  score?: number;
  elementID?: string;
  optionID?: number;
  elementType?: number;
  id?: number;
  content?: string;
  knowledge?: string;
  answer?: string;
}

export interface Option {
  flag?: number;
  id?: string;
  content?: string;
}

export interface RecordFollowRead {
  modeList?: ModeList[];
  paragraphList?: ParagraphList[];
}

export interface ModeList {
  sentences?: ModeListSentence[];
  name?: string;
  mediaFile?: string;
}

export interface ModeListSentence {
  ref?: number;
  startTime?: string;
  endTime?: string;
}

export interface ParagraphList {
  pre?: string;
  sentences?: ParagraphListSentence[];
}

export interface ParagraphListSentence {
  contentCN?: string;
  netFiles?: string[];
  elementID?: string;
  contentEn?: string;
  elementType?: number;
  id?: number;
}

export interface RecordSpeak {
  work?: string;
  show?: string;
  elementID?: string;
  fake?: string;
  elementType?: number;
  soundFile?: string;
  netFile?: string;
  content?: string;
}

export interface TaskObj {
  curTaskPageTotal?: number;
  taskTotal?: number;
  curTaskPageIndex?: number;
  taskID?: string;
  taskNum?: number;
}
