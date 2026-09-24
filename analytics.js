/* Proof product analytics (PostHog). Loaded after app.js and realtime.js.
   Tracks the funnel: landing -> idea started -> voice session -> result -> build plan.
   Session replay masks all inputs and all page text in the browser before anything
   is sent, so replays show layout, clicks, and scrolling but not what people typed
   or what their plan says. Voice audio is never recorded. */
(function () {
  var POSTHOG_KEY = 'phc_Ah45nwgthdcx2tHwaiTz6eTs4C7jicTfM8jUwyeSuPJJ';
  var POSTHOG_HOST = 'https://us.i.posthog.com';

  !function(t,e){var o,n,p,r;e.__SV||(window.posthog && window.posthog.__loaded)||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}p||((p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",p.onerror=function(){p=null},(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r));var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],Object.defineProperty(u,"toString",{configurable:!0,enumerable:!0,writable:!0,value:function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e}}),Object.defineProperty(u.people,"toString",{configurable:!0,enumerable:!0,writable:!0,value:function(){return u.toString(1)+".people (stub)"}}),o="mu yu bu Su init Vu Gu zu Uu Ku il Wu Yu ju rh oh ah uh hh dh capture getExtension Zu pu gh calculateEventProperties ph register register_once register_for_session unregister unregister_for_session Hu mh getFeatureFlag getFeatureFlagPayload getFeatureFlagResult getAllFeatureFlags isFeatureEnabled reloadFeatureFlags updateFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSurveysLoaded onSessionId getSurveys getActiveMatchingSurveys renderSurvey displaySurvey cancelPendingSurvey canRenderSurvey canRenderSurveyAsync wh identify setPersonProperties unsetPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset kh shutdown setIdentity clearIdentity get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException addExceptionStep captureLog startExceptionAutocapture stopExceptionAutocapture loadToolbar get_property getSessionProperty yh ih createPersonProfile setInternalOrTestUser bh xu Cu opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing get_explicit_consent_status is_capturing clear_opt_in_out_capturing th debug nl Os getPageViewId captureTraceFeedback captureTraceMetric Du".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    defaults: '2026-05-30',
    person_profiles: 'identified_only',
    mask_all_text: true,
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: '*'
    }
  });

  function track(name, props) {
    try { posthog.capture(name, props || {}); } catch (e) {}
  }

  var fired = {};
  function once(key, name, props) {
    if (fired[key]) return;
    fired[key] = true;
    track(name, props);
  }

  var PRIVACY_NOTE = 'Privacy: your account and saved plans are stored only in this browser. To improve Proof we use anonymous usage analytics and screen replays (PostHog) that hide everything you type and all on-screen text. Replays never include voice audio.';

  function fixPrivacyCopy() {
    var root = document.getElementById('app');
    if (!root) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var node;
    while ((node = walker.nextNode())) {
      var v = node.nodeValue;
      if (v.indexOf('Everything stays on this device') >= 0) {
        node.nodeValue = v.replace('Everything stays on this device', 'Your plan is saved on this device');
      } else if (v.indexOf('nothing leaves this device') >= 0) {
        node.nodeValue = v.replace('nothing leaves this device', 'your account stays in this browser');
      } else if (v.indexOf('nothing sent to any server') >= 0) {
        node.nodeValue = v.replace('nothing sent to any server', 'account details never sent to any server');
      }
    }
    var landing = root.querySelector('.landing');
    if (landing && !landing.querySelector('.privacy-note')) {
      var p = document.createElement('p');
      p.className = 'privacy-note';
      p.textContent = PRIVACY_NOTE;
      p.style.cssText = 'max-width:640px;margin:32px auto 24px;padding:0 20px;font-size:12px;line-height:1.5;opacity:.6;text-align:center;';
      landing.appendChild(p);
    }
  }

  var last = { screen: null, step: null, account: null };
  function afterRender() {
    try {
      var s = state;
      var screen = s.screen;
      var step = s.project ? s.project.step : null;
      var pid = s.project ? s.project.id : 'none';

      if (screen !== last.screen || step !== last.step) {
        track('screen_viewed', { screen: screen, step: step, step_name: step != null && steps[step] ? steps[step].short : null });
      }
      if (screen === 'ideate') once('ideate:' + pid, 'idea_started', { mode: 'guided' });
      if (screen === 'work' && s.project) once('project:' + pid, 'idea_started', { mode: 'typed' });
      if (screen === 'gate') once('gate:' + pid, 'result_gate_viewed', { step: step });
      if (screen === 'work' && step === 4) once('result:' + pid, 'result_viewed', {});
      if (screen === 'work' && step === 5) once('plan:' + pid, 'plan_completed', { coach: s.project && s.project.coach || null });
      if (!last.account && s.account) track('account_ready', {});

      last.screen = screen; last.step = step; last.account = !!s.account;
    } catch (e) {}
    try { fixPrivacyCopy(); } catch (e) {}
  }

  if (typeof render === 'function') {
    var baseRender = render;
    render = function () {
      var out = baseRender.apply(this, arguments);
      afterRender();
      return out;
    };
  }

  if (window.fetch) {
    var baseFetch = window.fetch;
    window.fetch = function (input, init) {
      var url = typeof input === 'string' ? input : (input && input.url) || '';
      var p = baseFetch.apply(this, arguments);
      if (url.indexOf('/api/realtime/session') >= 0) {
        p.then(function (res) {
          track(res.ok ? 'voice_session_started' : 'voice_session_failed', { status: res.status });
        }, function () {
          track('voice_session_failed', { status: 0 });
        });
      }
      return p;
    };
  }

  afterRender();
})();
