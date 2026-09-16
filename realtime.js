/* Proof realtime voice session. Requires a server endpoint at /api/realtime/session
   that mints short-lived OpenAI Realtime client secrets. No provider key belongs here. */
(() => {
  const baseStart = startIdeation;
  const baseKill = killVoice;
  const baseFinish = finishIdeation;
  const rt = { pc:null, dc:null, stream:null, audio:null, status:'ready', detail:'Tap Start conversation', active:false, transcript:[], error:'', connected:false };
  window.proofRealtime = rt;

  function cleanUp() {
    rt.active = false; rt.connected = false;
    try { rt.dc?.close(); } catch {}
    try { rt.pc?.close(); } catch {}
    try { rt.stream?.getTracks().forEach(t => t.stop()); } catch {}
    try { rt.audio?.remove(); } catch {}
    rt.pc = rt.dc = rt.stream = rt.audio = null;
  }
  function setStatus(status, detail) { rt.status=status; rt.detail=detail; if (state.screen==='ideate') render(); }
  function stageCount() { return state.ideation ? ideaStageIndex(state.ideation) : 0; }
  function mergeProgress(v) {
    if (!state.ideation || !v || typeof v !== 'object') return;
    for (const k of ideaStages.map(x=>x.key)) if (typeof v[k] === 'string' && v[k].trim()) state.ideation.answers[k] = v[k].trim();
    persist();
  }
  function onEvent(e) {
    let m; try { m=JSON.parse(e.data); } catch { return; }
    if (m.type==='input_audio_buffer.speech_started') setStatus('listening','I hear you');
    if (m.type==='input_audio_buffer.speech_stopped') setStatus('thinking','Thinking');
    if (m.type==='response.audio.delta') { rt.status='speaking'; rt.detail='Proof is speaking - talk anytime to interrupt'; }
    if (m.type==='response.done') setStatus('listening','Listening');
    if (m.type==='conversation.item.input_audio_transcription.completed' && m.transcript) {
      rt.transcript.push({role:'user',text:m.transcript}); render();
    }
    if (m.type==='response.audio_transcript.done' && m.transcript) {
      rt.transcript.push({role:'proof',text:m.transcript}); render();
    }
    if (m.type==='response.function_call_arguments.done' && m.name==='update_proof_progress') {
      try { mergeProgress(JSON.parse(m.arguments)); } catch {}
      try { rt.dc.send(JSON.stringify({type:'conversation.item.create',item:{type:'function_call_output',call_id:m.call_id,output:'Progress saved quietly.'}})); } catch {}
      render();
    }
    if (m.type==='error') { rt.error=m.error?.message || 'The real-time session stopped.'; setStatus('error',rt.error); }
  }
  async function startRealtime() {
    if (rt.active) return;
    rt.error=''; setStatus('connecting','Connecting secure real-time audio');
    try {
      rt.stream = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
      const tokenRes = await fetch('/api/realtime/session', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({product:'proof-idea-lab'})});
      if (!tokenRes.ok) throw new Error(tokenRes.status===404 ? 'Proof needs its secure real-time provider connection.' : `Session service returned ${tokenRes.status}.`);
      const token = await tokenRes.json();
      const secret = token?.client_secret?.value || token?.value || token?.client_secret;
      if (!secret) throw new Error('The session service did not return a short-lived client secret.');
      const pc = rt.pc = new RTCPeerConnection();
      const audio = rt.audio = document.createElement('audio'); audio.autoplay=true; audio.playsInline=true; audio.hidden=true; document.body.appendChild(audio);
      pc.ontrack = ev => { audio.srcObject=ev.streams[0]; };
      rt.stream.getTracks().forEach(t => pc.addTrack(t,rt.stream));
      const dc=rt.dc=pc.createDataChannel('oai-events'); dc.addEventListener('message',onEvent);
      dc.addEventListener('open',()=>{
        rt.connected=rt.active=true; setStatus('listening','Listening - speak naturally');
        dc.send(JSON.stringify({type:'session.update',session:{type:'realtime',instructions:'You are Proof, a warm incisive founder thinking partner. Hold a natural spoken conversation. Listen more than you lecture. Ask one short useful follow-up at a time. Follow promising details instead of marching through a questionnaire. Never claim market validation. As you learn durable signals, call update_proof_progress quietly. After four useful signals, tell the founder you have enough for a working direction but keep talking if they want.',audio:{input:{turn_detection:{type:'semantic_vad',eagerness:'medium',create_response:true,interrupt_response:true},transcription:{model:'gpt-4o-mini-transcribe'}},output:{voice:'marin'}},tools:[{type:'function',name:'update_proof_progress',description:'Quietly save the durable founder signals learned so far.',parameters:{type:'object',properties:{spark:{type:'string'},moment:{type:'string'},customer:{type:'string'},outcome:{type:'string'},skills:{type:'string'},constraint:{type:'string'}},additionalProperties:false}}],tool_choice:'auto'}}));
        dc.send(JSON.stringify({type:'response.create',response:{instructions:'Open naturally in one brief sentence. Ask what idea, problem, or change has been on their mind.'}}));
      });
      const offer=await pc.createOffer(); await pc.setLocalDescription(offer);
      const sdp=await fetch('https://api.openai.com/v1/realtime/calls?model=gpt-realtime',{method:'POST',body:offer.sdp,headers:{Authorization:`Bearer ${secret}`,'Content-Type':'application/sdp'}});
      if (!sdp.ok) throw new Error(`The real-time provider rejected the session (${sdp.status}).`);
      await pc.setRemoteDescription({type:'answer',sdp:await sdp.text()});
    } catch(err) {
      cleanUp(); rt.error=err.message || 'Could not start real-time voice.'; setStatus('needs-connection',rt.error);
    }
  }
  function endRealtime(showResult=false) { cleanUp(); if (showResult && ideaReady(state.ideation)) baseFinish(); else { setStatus('ready','Tap Start conversation'); render(); } }

  startIdeation = function() {
    baseStart(); cleanUp(); rt.transcript=[]; rt.error=''; rt.status='ready'; rt.detail='Tap Start conversation';
  };
  killVoice = function() { cleanUp(); baseKill(); };
  ideateView = function() {
    const d=state.ideation, count=stageCount(), ready=ideaReady(d), progress=Math.round(count/ideaStages.length*100);
    return `<div class="realtime-page"><header class="realtime-head"><button id="backLanding" class="rt-round" aria-label="Back">←</button><div><b>Proof</b><small>Real-time idea conversation</small></div><button id="typeInstead" class="rt-type">Type instead</button></header><main class="realtime-main"><section class="rt-progress"><span>YOUR IDEA, TAKING SHAPE</span><div><i style="width:${progress}%"></i></div><small>${count} of ${ideaStages.length} useful signals · updates quietly as you talk</small></section><section class="rt-orb-wrap"><div class="rt-orb ${rt.status}"><i></i><i></i><i></i></div><h1>${rt.status==='speaking'?'Speaking':rt.status==='thinking'?'Thinking':rt.status==='listening'?'Listening':rt.status==='connecting'?'Connecting':'Talk it through'}</h1><p>${esc(rt.detail)}</p>${rt.status==='needs-connection'?`<div class="rt-blocker"><b>Real AI voice is not connected yet.</b><span>This screen will not fake it with browser dictation or text-to-speech. Add a secure server endpoint that mints short-lived Realtime client secrets, then Start conversation becomes a live duplex session.</span></div>`:''}</section><section class="rt-transcript" aria-live="polite">${rt.transcript.slice(-2).map(m=>`<p class="${m.role}">${esc(m.text)}</p>`).join('')}</section></main><footer class="rt-controls">${!rt.active&&rt.status!=='connecting'?`<button id="startRealtime" class="rt-start">Start conversation</button>`:''}${rt.active?`<button id="muteRealtime" class="rt-round">${rt.stream?.getAudioTracks()[0]?.enabled===false?'Unmute':'Mute'}</button>`:''}<button id="endRealtime" class="rt-end" aria-label="End conversation">×</button>${ready?'<button id="seeResults" class="rt-result">See working direction</button>':''}</footer><div class="rt-typing" hidden><form id="ideationForm"><textarea id="ideationAnswer" placeholder="Type what you are thinking..."></textarea><button>Send</button></form></div></div>`;
  };
  const baseBind=bind;
  bind=function(){
    baseBind(); if(state.screen!=='ideate') return;
    $('#startRealtime')?.addEventListener('click',startRealtime);
    $('#endRealtime')?.addEventListener('click',()=>endRealtime(false));
    $('#muteRealtime')?.addEventListener('click',()=>{const t=rt.stream?.getAudioTracks()[0];if(t){t.enabled=!t.enabled;render();}});
    $('#typeInstead')?.addEventListener('click',()=>{const p=$('.rt-typing');p.hidden=!p.hidden;if(!p.hidden) $('#ideationAnswer')?.focus();});
  };
  // Voice is the primary Proof entry. The full landing page remains reachable with Back.
  if (state.screen === 'landing') startIdeation();
})();
