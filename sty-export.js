function styleSectionName(id){return({mainA:"Main A",mainB:"Main B",fillA:"Fill In AA",introA:"Intro A",endingA:"Ending A"}[id]||id)}
function metaText(type,text){const bytes=strBytes(text);return[0xFF,type,...varLen(bytes.length),...bytes]}
function buildExperimentalStyleBytes(){
  project.name=styleName.value||"Untitled Style";
  project.tempo=Number(tempo.value)||120;
  const ppq=480,events=[],sectionId=currentSection(),sec=project.sections[sectionId];
  const sectionName=styleSectionName(sectionId);
  sec.tracks.forEach(track=>track.notes.forEach(n=>{
    const tick=Math.round(n.start*ppq),dur=Math.round(n.duration*ppq),ch=track.midiChannel||9;
    events.push({tick,bytes:[0x90+ch,n.pitch,n.velocity||100]});
    events.push({tick:tick+dur,bytes:[0x80+ch,n.pitch,0]});
  }));
  events.sort((a,b)=>a.tick-b.tick);
  const endTick=ppq*4*BAR_COUNT;
  const tempoTrack=makeTrack([
    {tick:0,meta:metaText(0x03,"StyleForge Lite")},
    {tick:0,meta:metaText(0x01,"STYLEFORGE_EXPERIMENTAL_STY")},
    {tick:0,meta:metaText(0x06,sectionName)},
    {tick:0,meta:[0xFF,0x51,0x03,...tempoBytes(project.tempo)]},
    {tick:endTick,meta:[0xFF,0x2F,0]}
  ]);
  const pes=[{delta:0,bytes:metaText(0x03,sectionName)}];
  let lastTick=0;
  for(const ev of events){pes.push({delta:ev.tick-lastTick,bytes:ev.bytes});lastTick=ev.tick}
  pes.push({delta:Math.max(0,endTick-lastTick),bytes:[0xFF,0x2F,0]});
  const patternTrack=makeTrack(pes,true);
  const header=[...strBytes("MThd"),0,0,0,6,0,1,0,2,(ppq>>8)&255,ppq&255];
  return new Uint8Array([...header,...tempoTrack,...patternTrack]);
}
function exportExperimentalStyle(){
  const sty=buildExperimentalStyleBytes();
  downloadBlob(sty,`${safeName(project.name)}-${currentSection()}-experimental.sty`,"application/octet-stream");
}
window.addEventListener("DOMContentLoaded",()=>{
  const btn=document.getElementById("exportStyleBtn");
  if(btn)btn.onclick=exportExperimentalStyle;
});