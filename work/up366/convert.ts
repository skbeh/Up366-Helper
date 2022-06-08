import { AnswerPage } from "./answerPage";

// Converts JSON strings to/from your types
// and asserts the results of JSON.parse at runtime
export class Convert {
  public static toAnswerPage(json: string): AnswerPage {
    return cast(JSON.parse(json), r("AnswerPage"));
  }

  public static answerPageToJson(value: AnswerPage): string {
    return JSON.stringify(uncast(value, r("AnswerPage")), null, 2);
  }

  public static objectToAnswerPage(obj: any): AnswerPage {
    return cast(obj, r("AnswerPage"));
  }
}

function invalidValue(typ: any, val: any, key: any = ""): never {
  if (key) {
    throw Error(
      `Invalid value for key "${key}". Expected type ${JSON.stringify(
        typ
      )} but got ${JSON.stringify(val)}`
    );
  }
  throw Error(
    `Invalid value ${JSON.stringify(val)} for type ${JSON.stringify(typ)}`
  );
}

function jsonToJSProps(typ: any): any {
  if (typ.jsonToJS === undefined) {
    const map: any = {};
    typ.props.forEach((p: any) => (map[p.json] = { key: p.js, typ: p.typ }));
    typ.jsonToJS = map;
  }
  return typ.jsonToJS;
}

function jsToJSONProps(typ: any): any {
  if (typ.jsToJSON === undefined) {
    const map: any = {};
    typ.props.forEach((p: any) => (map[p.js] = { key: p.json, typ: p.typ }));
    typ.jsToJSON = map;
  }
  return typ.jsToJSON;
}

function transform(val: any, typ: any, getProps: any, key: any = ""): any {
  function transformPrimitive(typ: string, val: any): any {
    if (typeof typ === typeof val) return val;
    return invalidValue(typ, val, key);
  }

  function transformUnion(typs: any[], val: any): any {
    // val must validate against one typ in typs
    const l = typs.length;
    for (let i = 0; i < l; i++) {
      const typ = typs[i];
      try {
        return transform(val, typ, getProps);
      } catch (_) {}
    }
    return invalidValue(typs, val);
  }

  function transformEnum(cases: string[], val: any): any {
    if (cases.indexOf(val) !== -1) return val;
    return invalidValue(cases, val);
  }

  function transformArray(typ: any, val: any): any {
    // val must be an array with no invalid elements
    if (!Array.isArray(val)) return invalidValue("array", val);
    return val.map((el) => transform(el, typ, getProps));
  }

  function transformDate(val: any): any {
    if (val === null) {
      return null;
    }
    const d = new Date(val);
    if (isNaN(d.valueOf())) {
      return invalidValue("Date", val);
    }
    return d;
  }

  function transformObject(
    props: { [k: string]: any },
    additional: any,
    val: any
  ): any {
    if (val === null || typeof val !== "object" || Array.isArray(val)) {
      return invalidValue("object", val);
    }
    const result: any = {};
    Object.getOwnPropertyNames(props).forEach((key) => {
      const prop = props[key];
      const v = Object.prototype.hasOwnProperty.call(val, key)
        ? val[key]
        : undefined;
      result[prop.key] = transform(v, prop.typ, getProps, prop.key);
    });
    Object.getOwnPropertyNames(val).forEach((key) => {
      if (!Object.prototype.hasOwnProperty.call(props, key)) {
        result[key] = val[key];
      }
    });
    return result;
  }

  if (typ === "any") return val;
  if (typ === null) {
    if (val === null) return val;
    return invalidValue(typ, val);
  }
  if (typ === false) return invalidValue(typ, val);
  while (typeof typ === "object" && typ.ref !== undefined) {
    typ = typeMap[typ.ref];
  }
  if (Array.isArray(typ)) return transformEnum(typ, val);
  if (typeof typ === "object") {
    return typ.hasOwnProperty("unionMembers")
      ? transformUnion(typ.unionMembers, val)
      : typ.hasOwnProperty("arrayItems")
      ? transformArray(typ.arrayItems, val)
      : typ.hasOwnProperty("props")
      ? transformObject(getProps(typ), typ.additional, val)
      : invalidValue(typ, val);
  }
  // Numbers can be parsed by Date but shouldn't be.
  if (typ === Date && typeof val !== "number") return transformDate(val);
  return transformPrimitive(typ, val);
}

function cast<T>(val: any, typ: any): T {
  return transform(val, typ, jsonToJSProps);
}

function uncast<T>(val: T, typ: any): any {
  return transform(val, typ, jsToJSONProps);
}

function a(typ: any) {
  return { arrayItems: typ };
}

function u(...typs: any[]) {
  return { unionMembers: typs };
}

function o(props: any[], additional: any) {
  return { props, additional };
}

function m(additional: any) {
  return { props: [], additional };
}

function r(name: string) {
  return { ref: name };
}

const typeMap: any = {
  AnswerPage: o(
    [
      { json: "isExam", js: "isExam", typ: u(undefined, r("Is")) },
      {
        json: "isShowPartBQuesTitle",
        js: "isShowPartBQuesTitle",
        typ: u(undefined, r("Is")),
      },
      {
        json: "isShowPartCQuesTable",
        js: "isShowPartCQuesTable",
        typ: u(undefined, r("Is")),
      },
      { json: "isCanRetry", js: "isCanRetry", typ: u(undefined, r("Is")) },
      {
        json: "isShowCustomQuesNumber",
        js: "isShowCustomQuesNumber",
        typ: u(undefined, r("Is")),
      },
      { json: "examTitle", js: "examTitle", typ: u(undefined, "") },
      { json: "examDescription", js: "examDescription", typ: u(undefined, "") },
      { json: "slides", js: "slides", typ: u(undefined, a(r("Slide"))) },
      { json: "mediaRes", js: "mediaRes", typ: u(undefined, "") },
      {
        json: "pageElement",
        js: "pageElement",
        typ: u(undefined, r("PageElement")),
      },
      { json: "taskObj", js: "taskObj", typ: u(undefined, r("TaskObj")) },
      { json: "pageNum", js: "pageNum", typ: u(undefined, 0) },
      { json: "dir_d", js: "dirD", typ: u(undefined, "") },
      { json: "pageId", js: "pageID", typ: u(undefined, "") },
      { json: "practice", js: "practice", typ: u(undefined, a(r("Slide"))) },
      { json: "element", js: "element", typ: u(undefined, a(r("Questions"))) },
      { json: "sliders", js: "sliders", typ: u(undefined, a(r("Slide"))) },
      {
        json: "sections",
        js: "sections",
        typ: u(undefined, a(r("Section")), a(r("Slide"))),
      },
    ],
    false
  ),
  PageElement: o(
    [
      { json: "element_id", js: "elementID", typ: u(undefined, "") },
      { json: "element_type", js: "elementType", typ: u(undefined, 0) },
    ],
    false
  ),
  Section: o(
    [{ json: "slides", js: "slides", typ: u(undefined, a(r("Slide"))) }],
    false
  ),
  Slide: o(
    [
      { json: "title", js: "title", typ: u(undefined, "") },
      { json: "description", js: "description", typ: u(undefined, "") },
      { json: "displayType", js: "displayType", typ: u(undefined, "") },
      {
        json: "questionList",
        js: "questionList",
        typ: u(undefined, a(r("QuestionList"))),
      },
      { json: "specialAnswers", js: "specialAnswers", typ: u(undefined, "") },
      {
        json: "specialAnswerScore",
        js: "specialAnswerScore",
        typ: u(undefined, ""),
      },
      { json: "flowConfig", js: "flowConfig", typ: u(undefined, "") },
      { json: "videoName", js: "videoName", typ: u(undefined, "") },
      { json: "isRandom", js: "isRandom", typ: u(undefined, "") },
      { json: "isShowRepeat", js: "isShowRepeat", typ: u(undefined, r("Is")) },
      {
        json: "isShowPartAQuestionText",
        js: "isShowPartAQuestionText",
        typ: u(undefined, ""),
      },
      { json: "curQuestionNum", js: "curQuestionNum", typ: u(undefined, "") },
      {
        json: "questions_list",
        js: "questionsList",
        typ: u(undefined, a(r("Questions")), a(r("QuestionList"))),
      },
      { json: "analysis", js: "analysis", typ: u(undefined, "") },
      {
        json: "questionObj",
        js: "questionObj",
        typ: u(undefined, r("Questions"), r("QuestionList")),
      },
      { json: "answer_text", js: "answerText", typ: u(undefined, "") },
    ],
    false
  ),
  QuestionList: o(
    [
      { json: "qtype_id", js: "qtypeID", typ: u(undefined, 0) },
      { json: "question_type", js: "questionType", typ: u(undefined, 0) },
      { json: "element_id", js: "elementID", typ: u(undefined, "") },
      { json: "element_type", js: "elementType", typ: u(undefined, 0) },
      { json: "media", js: "media", typ: u(undefined, r("Media")) },
      { json: "analysis", js: "analysis", typ: u(undefined, "") },
      { json: "question_id", js: "questionID", typ: u(undefined, "") },
      { json: "question_text", js: "questionText", typ: u(undefined, "") },
      { json: "medias", js: "medias", typ: u(undefined, a(r("Media"))) },
      { json: "options", js: "options", typ: u(undefined, a(r("Option"))) },
      {
        json: "record_follow_read",
        js: "recordFollowRead",
        typ: u(undefined, r("RecordFollowRead")),
      },
      { json: "question_score", js: "questionScore", typ: u(undefined, 0) },
      {
        json: "questions_list",
        js: "questionsList",
        typ: u(undefined, a(r("Questions"))),
      },
      { json: "knowledge", js: "knowledge", typ: u(undefined, "") },
      { json: "answer_text", js: "answerText", typ: u(undefined, "") },
      {
        json: "record_speak",
        js: "recordSpeak",
        typ: u(undefined, a(r("RecordSpeak"))),
      },
      { json: "question_no", js: "questionNo", typ: u(undefined, "") },
      {
        json: "answers_list",
        js: "answersList",
        typ: u(undefined, a(r("AnswersList"))),
      },
    ],
    false
  ),
  Media: o(
    [
      { json: "file", js: "file", typ: u(undefined, "") },
      { json: "type", js: "type", typ: u(undefined, r("Type")) },
    ],
    false
  ),
  AnswersWithAnswer: o(
    [
      {
        json: "answer",
        js: "answer",
        typ: u(undefined, r("AnswersList"), a(r("AnswersList"))),
      },
    ],
    false
  ),
  Questions: o(
    [
      { json: "question_text", js: "questionText", typ: u(undefined, "") },
      {
        json: "answers_list",
        js: "answersList",
        typ: u(undefined, a(r("AnswersList"))),
      },
      { json: "medias", js: "medias", typ: u(undefined, a("any")) },
      { json: "qtype_id", js: "qtypeID", typ: u(undefined, 0) },
      { json: "question_type", js: "questionType", typ: u(undefined, 0) },
      { json: "options", js: "options", typ: u(undefined, a(r("Option"))) },
      { json: "element_id", js: "elementID", typ: u(undefined, "") },
      { json: "element_type", js: "elementType", typ: u(undefined, 0) },
      { json: "question_score", js: "questionScore", typ: u(undefined, 3.14) },
      { json: "analysis", js: "analysis", typ: u(undefined, "") },
      { json: "question_id", js: "questionID", typ: u(undefined, "") },
      { json: "knowledge", js: "knowledge", typ: u(undefined, "") },
      {
        json: "answers",
        js: "answers",
        typ: u(undefined, a(r("AnswersList")), r("AnswersWithAnswer")),
      },
      { json: "question_no", js: "questionNo", typ: u(undefined, "") },
      { json: "answer_text", js: "answerText", typ: u(undefined, "") },
    ],
    false
  ),
  AnswersList: o(
    [
      { json: "score", js: "score", typ: u(undefined, 3.14) },
      { json: "element_id", js: "elementID", typ: u(undefined, "") },
      { json: "option_id", js: "optionID", typ: u(undefined, 0) },
      { json: "element_type", js: "elementType", typ: u(undefined, 0) },
      { json: "id", js: "id", typ: u(undefined, 0) },
      { json: "content", js: "content", typ: u(undefined, "") },
      { json: "knowledge", js: "knowledge", typ: u(undefined, "") },
      { json: "answer", js: "answer", typ: u(undefined, "") },
    ],
    false
  ),
  Option: o(
    [
      { json: "flag", js: "flag", typ: u(undefined, 0) },
      { json: "id", js: "id", typ: u(undefined, "") },
      { json: "content", js: "content", typ: u(undefined, "") },
    ],
    false
  ),
  RecordFollowRead: o(
    [
      {
        json: "mode_list",
        js: "modeList",
        typ: u(undefined, a(r("ModeList"))),
      },
      {
        json: "paragraph_list",
        js: "paragraphList",
        typ: u(undefined, a(r("ParagraphList"))),
      },
    ],
    false
  ),
  ModeList: o(
    [
      {
        json: "sentences",
        js: "sentences",
        typ: u(undefined, a(r("ModeListSentence"))),
      },
      { json: "name", js: "name", typ: u(undefined, "") },
      { json: "media_file", js: "mediaFile", typ: u(undefined, "") },
    ],
    false
  ),
  ModeListSentence: o(
    [
      { json: "ref", js: "ref", typ: u(undefined, 0) },
      { json: "startTime", js: "startTime", typ: u(undefined, "") },
      { json: "endTime", js: "endTime", typ: u(undefined, "") },
    ],
    false
  ),
  ParagraphList: o(
    [
      { json: "pre", js: "pre", typ: u(undefined, "") },
      {
        json: "sentences",
        js: "sentences",
        typ: u(undefined, a(r("ParagraphListSentence"))),
      },
    ],
    false
  ),
  ParagraphListSentence: o(
    [
      { json: "content_cn", js: "contentCN", typ: u(undefined, "") },
      { json: "net_files", js: "netFiles", typ: u(undefined, a("")) },
      { json: "element_id", js: "elementID", typ: u(undefined, "") },
      { json: "content_en", js: "contentEn", typ: u(undefined, "") },
      { json: "element_type", js: "elementType", typ: u(undefined, 0) },
      { json: "id", js: "id", typ: u(undefined, 0) },
    ],
    false
  ),
  RecordSpeak: o(
    [
      { json: "work", js: "work", typ: u(undefined, "") },
      { json: "show", js: "show", typ: u(undefined, "") },
      { json: "element_id", js: "elementID", typ: u(undefined, "") },
      { json: "fake", js: "fake", typ: u(undefined, "") },
      { json: "element_type", js: "elementType", typ: u(undefined, 0) },
      { json: "sound_file", js: "soundFile", typ: u(undefined, "") },
      { json: "net_file", js: "netFile", typ: u(undefined, "") },
      { json: "content", js: "content", typ: u(undefined, "") },
    ],
    false
  ),
  TaskObj: o(
    [
      {
        json: "curTaskPageTotal",
        js: "curTaskPageTotal",
        typ: u(undefined, 0),
      },
      { json: "taskTotal", js: "taskTotal", typ: u(undefined, 0) },
      {
        json: "curTaskPageIndex",
        js: "curTaskPageIndex",
        typ: u(undefined, 0),
      },
      { json: "task_id", js: "taskID", typ: u(undefined, "") },
      { json: "task_num", js: "taskNum", typ: u(undefined, 0) },
    ],
    false
  ),
  Is: ["", "Y"],
  Type: ["audio", "media"],
};
