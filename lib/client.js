/**
 * dsh-ds-peak-valley — browser client bundle.
 *
 * Registers a persistent 文峰/文谷 badge into the conversation composer dock,
 * right beside the session stats line (the "1 轮 · 68 步 | LLM ..." strip).
 * The badge is fully self-contained: it computes Beijing time with the
 * browser's Intl API and only requires the platform "react" seed module.
 */

window.__ModuleLoader__.load({
  // The registration id MUST equal the package name in package.json: the host
  // composes the boot graph per package name (client-modules), and a bundle
  // that registers under any other id never satisfies its row.
  id: "@ttxl314/dsh-ds-peak-valley",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    let react = require("react");

    var TIME_ZONE = "Asia/Shanghai";
    var PEAK_WEEKDAYS = [1, 2, 3, 4, 5]; // 1=Mon ... 7=Sun
    var PEAK_WINDOWS = [
      { start: 9 * 60, end: 12 * 60 }, // 09:00-12:00
      { start: 14 * 60, end: 18 * 60 } // 14:00-18:00
    ];
    var WEEKDAY_ISO = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

    function weekdayShort(date) {
      return new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, weekday: "short" }).format(date);
    }

    /** Peak (文峰) or valley (文谷) for an instant under the pricing schedule. */
    function computeStatus(date) {
      var parts = Object.fromEntries(
        new Intl.DateTimeFormat("en-US", {
          timeZone: TIME_ZONE,
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23"
        }).formatToParts(date).map(function (p) { return [p.type, p.value]; })
      );
      var weekday = WEEKDAY_ISO[weekdayShort(date)];
      var minuteOfDay = Number(parts.hour) * 60 + Number(parts.minute);
      var peak = PEAK_WEEKDAYS.indexOf(weekday) !== -1
        && PEAK_WINDOWS.some(function (w) { return minuteOfDay >= w.start && minuteOfDay < w.end; });
      return peak ? "peak" : "valley";
    }

    /**
     * The next state-change boundary after a date. Returns the state the
     * schedule is ENTERING and the minutes until it happens (Beijing time).
     *
     *   kind "valley" -> entering 文谷 (blue)  at Mon-Fri 12:00 and 18:00
     *   kind "peak"   -> entering 文峰 (red)   at Mon-Fri 09:00 and 14:00
     * Weekends are one continuous valley, so the next change is Monday 09:00.
     */
    function nextTransition(date) {
      var parts = Object.fromEntries(
        new Intl.DateTimeFormat("en-US", {
          timeZone: TIME_ZONE,
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23"
        }).formatToParts(date).map(function (p) { return [p.type, p.value]; })
      );
      var weekday = WEEKDAY_ISO[weekdayShort(date)];
      var minuteOfDay = Number(parts.hour) * 60 + Number(parts.minute);
      var curWeekMin = (weekday - 1) * 1440 + minuteOfDay;
      // All weekday state changes, in ascending week-minute order.
      var transitions = [];
      for (var d = 1; d <= 5; d++) {
        var base = (d - 1) * 1440;
        transitions.push({ weekMin: base + 540,  kind: "peak" });   // 09:00 谷→峰
        transitions.push({ weekMin: base + 720,  kind: "valley" }); // 12:00 峰→谷
        transitions.push({ weekMin: base + 840,  kind: "peak" });   // 14:00 谷→峰
        transitions.push({ weekMin: base + 1080, kind: "valley" }); // 18:00 峰→谷
      }
      var next = null;
      for (var i = 0; i < transitions.length; i++) {
        if (transitions[i].weekMin > curWeekMin) { next = transitions[i]; break; }
      }
      if (next === null) {
        // Past Friday 18:00 (or the weekend): next change is Monday 09:00.
        next = { weekMin: 540 + 7 * 1440, kind: "peak" };
      }
      return { kind: next.kind, minutes: next.weekMin - curWeekMin };
    }

    /** Compact minute countdown, e.g. 13小时20分 or 45分. */
    function formatCountdown(mins) {
      var h = Math.floor(mins / 60);
      var m = mins % 60;
      if (h === 0) return m + "分";
      if (m === 0) return h + "小时";
      return h + "小时" + m + "分";
    }

    /** "YYYY-MM-DD HH:mm:ss" in Beijing time. */
    function formatClock(date) {
      var parts = Object.fromEntries(
        new Intl.DateTimeFormat("en-US", {
          timeZone: TIME_ZONE,
          year: "numeric", month: "2-digit", day: "2-digit",
          hour: "2-digit", minute: "2-digit", second: "2-digit",
          hourCycle: "h23"
        }).formatToParts(date).map(function (p) { return [p.type, p.value]; })
      );
      return parts.year + "-" + parts.month + "-" + parts.day + " " + parts.hour + ":" + parts.minute + ":" + parts.second;
    }

    /** "HH:mm" in Beijing time. */
    function formatTime(date) {
      var parts = Object.fromEntries(
        new Intl.DateTimeFormat("en-US", {
          timeZone: TIME_ZONE,
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23"
        }).formatToParts(date).map(function (p) { return [p.type, p.value]; })
      );
      return parts.hour + ":" + parts.minute;
    }

    var BASE = {
      display: "inline-flex",
      alignItems: "center",
      height: "24px",
      padding: "0 12px",
      borderRadius: "12px",
      fontSize: "15px",
      lineHeight: "24px",
      fontWeight: 600,
      whiteSpace: "nowrap",
      userSelect: "none"
    };
    var PEAK_STYLE = { background: "rgba(229, 72, 77, 0.15)", color: "#e5484d" }; // 文峰：红色
    var VALLEY_STYLE = { background: "rgba(0, 145, 255, 0.15)", color: "#0091ff" }; // 文谷：蓝色
    for (var key in BASE) {
      PEAK_STYLE[key] = BASE[key];
      VALLEY_STYLE[key] = BASE[key];
    }
    // 尾部「距下峰 / 距下谷」倒计时专用小字号：徽标正文（BASE.fontSize）放大时
    // 这段保持原样，不跟着变大。
    var COUNT_FONT_SIZE = "11px";

    function PeakValleyBadge() {
      // Beijing time is computed locally from the browser clock via Intl — no
      // API call and no tokens. Tick once a minute to keep the clock fresh.
      var nowState = react.useState(function () { return Date.now(); });
      var now = nowState[0];
      var setNow = nowState[1];
      react.useEffect(function () {
        var id = setInterval(function () { setNow(Date.now()); }, 60000);
        return function () { clearInterval(id); };
      }, []);
      var status = computeStatus(new Date(now));
      var peak = status === "peak";
      var label = peak ? "文峰" : "文谷";
      var kind = peak ? "高峰时段" : "空闲时段";
      var trans = nextTransition(new Date(now));
      var toValley = trans.kind === "valley";
      var countLabel = toValley ? "距下谷" : "距下峰";
      var countStyle = toValley
        ? { color: "#0091ff", fontWeight: 600, fontSize: COUNT_FONT_SIZE }
        : { color: "#e5484d", fontWeight: 600, fontSize: COUNT_FONT_SIZE };
      return react.createElement("span", {
        style: peak ? PEAK_STYLE : VALLEY_STYLE,
        title: "DeepSeek " + kind + "「" + label + "」 · " + formatClock(new Date(now)) + " (" + TIME_ZONE + ")"
      },
        label + " " + formatTime(new Date(now)) + " · ",
        react.createElement("span", { style: countStyle }, countLabel + " " + formatCountdown(trans.minutes)));
    }

    var inject = ["slots"];

    function apply(ctx) {
      // Wait for the conversation plugin to declare the composer dock slot,
      // then add the badge beside the session stats line.
      ctx.slots.inject("conversation.composer.dock", () => ctx.slots.register({
        name: "conversation.composer.dock",
        id: "ds-peak-valley",
        order: 1
      }, PeakValleyBadge));
    }

    exports.apply = apply;
    exports.inject = inject;
    exports.computeStatus = computeStatus;
    exports.nextTransition = nextTransition;
    exports.formatCountdown = formatCountdown;
    exports.PeakValleyBadge = PeakValleyBadge;
    return module.exports;
  }
});
