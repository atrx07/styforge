function styleSectionName(id){return({mainA:"Main A",mainB:"Main B",fillA:"Fill In AA",introA:"Intro A",endingA:"Ending A"}[id]||id)}
function metaText(type,text){const bytes=strBytes(text);return[255,type,...varLen(bytes.length),...bytes]}
function activeExportTracks(section){return (typeof activeTracks==="function")?activeTracks(section):section.tracks}
function collectStyleEvents(){project.name=styleName.value||"Untitled Style";project.tempo=Number(tempo.value)||120;const ppq=480,events=[];let sectionStart=0;const order=["introA","mainA","mainB","fillA","endingA"];
  events.push({tick:0,bytes:[255,81,3,...tempoBytes(project.tempo)]});
  events.push({tick:0,bytes:metaText(6,"SFF1")});
  events.push({tick:0,bytes:metaText(3,(project.name||"StyleForge").slice(0,16))});
  events.push({tick:0,bytes:metaText(1,"StyleForge full export")});
  for(const sectionId of order){const sec=project.sections[sectionId];if(!sec)continue;const sectionName=styleSectionName(sectionId);events.push({tick:sectionStart,bytes:metaText(6,sectionName)});events.push({tick:sectionStart,bytes:metaText(1,"fn:"+sectionName)});for(const track of activeExportTracks(sec)){for(const n of track.notes){const tick=sectionStart+Math.round(n.start*ppq),dur=Math.round((n.duration||0.25)*ppq),ch=track.midiChannel||9;events.push({tick,bytes:[192+ch,0]});events.push({tick,bytes:[144+ch,n.pitch,n.velocity||100]});events.push({tick:tick+dur,bytes:[128+ch,n.pitch,0]});}}
    sectionStart+=ppq*4*BAR_COUNT;}
  events.push({tick:sectionStart,bytes:[255,47,0]});events.sort((a,b)=>a.tick-b.tick);return events}
function makeOneTrackMidi(events){const ppq=480,pes=[];let last=0;for(const ev of events){pes.push({delta:Math.max(0,ev.tick-last),bytes:ev.bytes});last=ev.tick}const track=makeTrack(pes,true);const header=[...strBytes("MThd"),0,0,0,6,0,0,0,1,(ppq>>8)&255,ppq&255];return new Uint8Array([...header,...track])}
function buildExperimentalStyleBytes(){return makeOneTrackMidi(collectStyleEvents())}
function exportExperimentalStyle(){const sty=buildExperimentalStyleBytes();downloadBlob(sty,`${safeName(project.name)}-full-experimental.sty`,"application/octet-stream")}
window.addEventListener("DOMContentLoaded",()=>{const btn=document.getElementById("exportStyleBtn");if(btn)btn.onclick=exportExperimentalStyle;});