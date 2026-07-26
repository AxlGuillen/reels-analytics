import { describe, expect, test } from "bun:test";
import { rollupStatus, type Check, type CheckStatus } from "./status";

/** Check mínimo con el estado dado (el detalle no influye en el rollup). */
function check(status: CheckStatus, name = "x"): Check {
  return { name, status, detail: "" };
}

describe("rollupStatus", () => {
  test("todo ok → ok", () => {
    expect(rollupStatus([check("ok"), check("ok")])).toBe("ok");
  });

  test("un warn → degraded", () => {
    expect(rollupStatus([check("ok"), check("warn")])).toBe("degraded");
  });

  test("un fail → down", () => {
    expect(rollupStatus([check("ok"), check("fail")])).toBe("down");
  });

  test("fail manda sobre warn", () => {
    expect(rollupStatus([check("warn"), check("fail"), check("ok")])).toBe("down");
  });

  test("sin checks no inventa un problema", () => {
    expect(rollupStatus([])).toBe("ok");
  });
});
