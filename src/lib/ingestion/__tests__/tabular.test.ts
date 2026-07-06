import { describe, it, expect } from "vitest";
import { parseTabularQuestions } from "../tabular";

describe("parseTabularQuestions", () => {
  it("maps a standard question-bank sheet", () => {
    const rows = [
      ["No", "Question", "Option A", "Option B", "Option C", "Option D", "Answer", "Explanation"],
      ["1", "What is an IP address?", "A number", "A cable", "A device", "A layer", "A", "It identifies a host."],
      ["2", "What does DNS resolve?", "Names", "Cables", "Ports", "Frames", "a", ""],
    ];
    const result = parseTabularQuestions(rows);
    expect(result).not.toBeNull();
    expect(result!.candidates).toHaveLength(2);

    const first = result!.candidates[0];
    expect(first.stem).toBe("What is an IP address?");
    expect(first.options).toHaveLength(4);
    expect(first.correct_options).toEqual(["A"]);
    expect(first.explanation).toBe("It identifies a host.");

    const second = result!.candidates[1];
    expect(second.correct_options).toEqual(["A"]); // lowercase normalized
    expect(second.explanation).toBeNull(); // empty cell stays null — never invented
  });

  it("keeps full-text answers as answer_text instead of forcing a letter", () => {
    const rows = [
      ["question", "answer"],
      ["Define encapsulation.", "Wrapping data with protocol headers."],
    ];
    const result = parseTabularQuestions(rows);
    expect(result!.candidates[0].answer_text).toBe("Wrapping data with protocol headers.");
    expect(result!.candidates[0].correct_options).toBeNull();
  });

  it("handles multi-answer cells", () => {
    const rows = [
      ["question", "a", "b", "c", "d", "key"],
      ["Select all routing protocols", "OSPF", "HTTP", "EIGRP", "SMTP", "A, C"],
    ];
    const result = parseTabularQuestions(rows);
    expect(result!.candidates[0].correct_options).toEqual(["A", "C"]);
    expect(result!.candidates[0].question_type).toBe("mcq_multi");
  });

  it("returns null when there is no question column", () => {
    expect(
      parseTabularQuestions([
        ["Name", "Age"],
        ["Alice", "30"],
      ]),
    ).toBeNull();
  });

  it("skips rows with empty stems and counts them", () => {
    const rows = [
      ["question", "answer"],
      ["", "A"],
      ["Real question?", "B"],
    ];
    const result = parseTabularQuestions(rows);
    expect(result!.candidates).toHaveLength(1);
    expect(result!.skippedRows).toBe(1);
  });

  it("captures topic hints", () => {
    const rows = [
      ["question", "topic"],
      ["What is OSPF?", "Routing"],
    ];
    const result = parseTabularQuestions(rows);
    expect(result!.topicHints[0]).toBe("Routing");
  });
});
