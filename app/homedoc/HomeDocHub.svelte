<script lang="ts">
    import { onMount } from 'svelte';
    import { alert, confirm, prompt } from '@nativescript-community/ui-material-dialogs';
    import { navigate } from '@shared/utils/svelte/ui';
    import CActionBar from '~/components/common/CActionBar.svelte';
    import { documentsService } from '~/services/documents';
    import { OCRLanguages, ocrService } from '~/services/ocr';
    import { checkOrDownloadOCRLanguages } from '~/utils/ui';
    import { analyzeOcrText, isValidIsoDate } from './analyzer.mjs';
    import { getRecords, removeRecord, upsertRecord, type HomeDocCategory, type HomeDocRecord } from './store';

    type ScannedDoc = { id: string; name: string; text: string; pageCount: number; manual?:boolean };
    // The dashboard is the app's root page; it has no previous screen.
    // A HomeDoc screen opened from the scanner may optionally navigate back.
    export let allowReturnToScanner: boolean = false;
    type View = 'home'|'documents'|'add'|'dates'|'settings'|'review';
    const cat: HomeDocCategory[] = ['bill','receipt','warranty','insurance','letter','other'];
    const bg='#F5F7F6',ink='#17333C',accent='#145E55',mint='#E8F4EF',muted='#728583',white='#FFFFFF';
    let view:View = 'home';
    let docs:ScannedDoc[] = [];
    let reviews:HomeDocRecord[] = getRecords();
    let active:ScannedDoc|null=null;
    let hints:ReturnType<typeof analyzeOcrText>|null=null;
    let loading=false,error='',q='';
    let manualTitle='',manualText='',aiBusy=false;
    type OCRQuality = 'fast' | 'standard' | 'best';
    let ocrQuality: OCRQuality = ocrService.dataType || 'best';
    let ocrDownloading = false;
    let ocrInstalled = ocrService.languagesArray.every(lang=>ocrService.downloadedLanguages.includes(lang));
    let draft={title:'',category:'other' as HomeDocCategory,dueDate:'',amount:'',currency:''};

    $: deadlines=reviews.filter(r=>r.dueDate).sort((a,b)=>a.dueDate.localeCompare(b.dueDate));
    $: reviewedIds=reviews.map(r=>r.documentId);
    $: library=docs.filter(d=>(d.name+' '+d.text).toLowerCase().includes(q.toLowerCase()))
        .concat(reviews.filter(r=>r.documentId.startsWith('manual-')&&!docs.some(d=>d.id===r.documentId) && r.title.toLowerCase().includes(q.toLowerCase()))
            .map(r=>({id:r.documentId,name:r.title,text:'',pageCount:0,manual:true})));
    $: recent=docs.length?docs.slice(-3).reverse():library.slice(-3).reverse();

    $: ocrLanguageNames = ocrService.languagesArray.map(lang => OCRLanguages[lang] || lang).join(', ');
    $: ocrQualityDescription = ocrQuality === 'fast' ? 'Fastest; best for clear, printed text.' : ocrQuality === 'standard' ? 'Balanced speed and recognition detail.' : 'Most accurate Tesseract model; larger and slower.';

    function selectOCRQuality(mode: OCRQuality) {
        ocrService.dataType = mode;
        ocrQuality = mode;
        ocrInstalled = ocrService.languagesArray.every(lang => ocrService.downloadedLanguages.includes(lang));
    }

    async function downloadOCRModels() {
        if (ocrDownloading) return;
        ocrDownloading = true;
        try {
            const result = await checkOrDownloadOCRLanguages({
                dataType: ocrQuality,
                languages: ocrService.languagesArray,
                shouldConfirm: true
            });
            ocrInstalled = ocrService.languagesArray.every(lang => ocrService.downloadedLanguages.includes(lang));
            if (result && ocrInstalled) {
                await alert({ title: 'OCR ready', message: 'Language files for this quality are installed on the device.', okButtonText: 'OK' });
            }
        } catch (cause) {
            console.log('HomeDoc OCR model download', cause);
            await alert({ title: 'Download unavailable', message: 'Could not prepare the OCR language files. Check the network connection and try again.', okButtonText: 'OK' });
        } finally {
            ocrDownloading = false;
        }
    }

    onMount(()=>{refresh();});
    async function openScanner(){
        const Scanner=(await import('~/components/list/DocumentsList.svelte')).default;
        navigate({page:Scanner});
    }
    async function refresh(){
        loading=true; error='';
        try{
            const scanned=await documentsService.documentRepository.findDocuments();
            const localManual=docs.filter(d=>d.manual);
            docs=[...scanned.map(d=>({
                id:String(d.id), name:d.name||'Untitled document',
                text:(d.pages||[]).map(p=>p.ocrData?.text||'').join('\n'),
                pageCount:(d.pages||[]).length
            })), ...localManual];
        } catch(e){error='Could not load scans. Please retry in the scanner.';console.log('HomeDoc load',e);}
        finally{loading=false;reviews=getRecords();}
    }
    function changeTab(tab:View){view=tab;error='';if(tab==='documents'||tab==='home')refresh();}
    function open(doc:ScannedDoc){
        active=doc; hints=analyzeOcrText(doc.text,doc.name);
        const saved=reviews.find(r=>r.documentId===doc.id);
        draft=saved?{title:saved.title,category:saved.category,dueDate:saved.dueDate,amount:saved.amount,currency:saved.currency}
        :{title:hints.title,category:hints.category as HomeDocCategory,dueDate:hints.dueDate,amount:hints.amount,currency:hints.currency};
        view='review';error='';
    }
    function openSaved(r:HomeDocRecord){
        open(docs.find(d=>d.id===r.documentId)||{id:r.documentId,name:r.title,text:'',pageCount:0,manual:r.documentId.startsWith('manual-')});
    }
    function addFromText(){
        if(!manualTitle.trim()||!manualText.trim()){error='Enter a title and extracted text first.';return;}
        const item={id:'manual-'+Date.now(),name:manualTitle.trim().slice(0,150),text:manualText.trim(),pageCount:0,manual:true};
        docs=[...docs,item];open(item);
    }
    function cycleCat(){draft={...draft,category:cat[(cat.indexOf(draft.category)+1)%cat.length]};}
    function update(k:'title'|'dueDate'|'amount'|'currency',t:string){draft={...draft,[k]:t};}
    async function save(){
        if(!active)return;
        if(!draft.title.trim()){error='Document title is required.';return;}
        if(draft.dueDate&&!isValidIsoDate(draft.dueDate.trim())){error='Date must be a valid YYYY-MM-DD.';return;}
        if(draft.amount&&!/^\d+(?:\.\d{1,2})?$/.test(draft.amount.trim())){error='Amount must be a number such as 73.20.';return;}
        upsertRecord({documentId:active.id,title:draft.title.trim().slice(0,150),category:draft.category,
            dueDate:draft.dueDate.trim(),amount:draft.amount.trim(),currency:draft.currency.trim().toUpperCase().slice(0,3),
            savedAt:Date.now(),confirmed:true});
        reviews=getRecords();view='home';error='';
        await alert({title:'Review saved',message:'The confirmed deadline was saved on this device. Native notifications are not yet enabled.',okButtonText:'OK'});
    }
    async function forgetRecord(){
        if(!active)return;
        const yes=await confirm({title:'Remove HomeDoc review?',message:'Your underlying scanned PDF remains unchanged.',okButtonText:'Remove',cancelButtonText:'Cancel'});
        if(yes){removeRecord(active.id);reviews=getRecords();view='documents';}
    }
    async function clearData(){
        const yes=await confirm({title:'Clear HomeDoc reviews?',message:'Delete ALL saved HomeDoc metadata on this device? The scanner documents will not be deleted.',okButtonText:'Delete reviews',cancelButtonText:'Cancel'});
        if(yes){for(const r of getRecords())removeRecord(r.documentId);reviews=getRecords();view='home';}
    }
    async function cloudAI(){
        if(!active?.text){error='No OCR text available for this document.';return;}
        const yes=await confirm({title:'Optional cloud AI',message:'This sends OCR text to a development server of your choice. Do not use real personal documents during testing.',okButtonText:'Continue',cancelButtonText:'Stay offline'});
        if(!yes)return;
        const endpoint=await prompt({title:'HomeDoc API URL',message:'Enter your /v1/analyze HTTPS endpoint',defaultText:'https://example.invalid/v1/analyze',okButtonText:'Next',cancelButtonText:'Cancel'});
        if(!endpoint.result)return;
        const url=endpoint.text.trim();
        if(!/^https:\/\/[^\s]+\/v1\/analyze$/.test(url)){error='An HTTPS /v1/analyze endpoint is required.';return;}
        const token=await prompt({title:'Development access token',message:'Server access token (not a provider API key)',inputType:'password',okButtonText:'Analyze',cancelButtonText:'Cancel'});
        if(!token.result||!token.text)return;
        aiBusy=true;error='';
        try{
            const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token.text},
              body:JSON.stringify({title:active.name,text:active.text.slice(0,12000)})});
            if(!res.ok)throw Error('Server returned '+res.status);
            const result=await res.json();
            if(!result||!result.reviewRequired||!Array.isArray(result.warnings))throw Error('Invalid AI result');
            hints={...hints,...result};
            draft={...draft,category:cat.includes(result.category)?result.category:'other',
                dueDate:result.dueDate||'',amount:result.amount||'',currency:result.currency||''};
        }catch(e){error='AI server failed. Offline review still works.';}finally{aiBusy=false;}
    }
</script>

<page actionBarHidden={true} backgroundColor={bg}>
  <gridlayout rows="auto,*,auto">
    <CActionBar row={0} title="HomeDoc AI" disableBackButton={!allowReturnToScanner} />
    <scrollview row={1}>
      <stacklayout padding="18" backgroundColor={bg}>
        {#if view==='home'}
          <label text="YOUR PAPERWORK, ORGANIZED" color={muted} fontSize="11" fontWeight="700" letterSpacing="0.6"/>
          <label text="Your home, under control." color={ink} fontSize="26" fontWeight="700" marginTop="9" marginBottom="14" textWrap={true}/>
          <stacklayout backgroundColor="#143C41" borderRadius="20" padding="21" marginBottom="17">
            <label text="HOME DOC  /  YOUR ASSISTANT" color="#BCE6C9" fontSize="10" fontWeight="700"/>
            <label text="Documents into peace of mind." color={white} fontSize="22" fontWeight="700" marginTop="11" textWrap={true}/>
            <label text="Find paperwork, review the important numbers, and keep deadlines in one place." color="#C4DAD7" fontSize="13" textWrap={true} marginTop="9" marginBottom="12"/>
            <mdbutton text="+ Add a document" backgroundColor="#C5EDC7" color="#164A42" fontWeight="700" on:tap={()=>changeTab('add')} />
          </stacklayout>
          <gridlayout columns="*,*,*" marginBottom="20">
            <stacklayout col={0} backgroundColor={white} borderRadius="13" padding="10" marginRight="4">
              <label text={String(docs.length + reviews.filter(r=>r.documentId.startsWith('manual-')&&!docs.some(d=>d.id===r.documentId)).length)} fontSize="27" color={ink} fontWeight="700"/>
              <label text="Documents" fontSize="11" color={muted}/>
            </stacklayout>
            <stacklayout col={1} backgroundColor={white} borderRadius="13" padding="10" marginLeft="2" marginRight="2">
              <label text={String(deadlines.length)} fontSize="27" color={ink} fontWeight="700"/>
              <label text="Dates saved" fontSize="11" color={muted}/>
            </stacklayout>
            <stacklayout col={2} backgroundColor={white} borderRadius="13" padding="10" marginLeft="4">
              <label text={String(Math.max(docs.length-reviewedIds.length,0))} fontSize="27" color={ink} fontWeight="700"/>
              <label text="To review" fontSize="11" color={muted}/>
            </stacklayout>
          </gridlayout>
          <gridlayout columns="*,auto" marginBottom="12">
            <label col={0} text="Upcoming deadlines" fontSize="17" fontWeight="700" color={ink}/>
            <label col={1} text="See all  ›" color={accent} fontSize="13" on:tap={()=>changeTab('dates')}/>
          </gridlayout>
          {#if deadlines.length===0}
            <stacklayout backgroundColor={white} borderRadius="15" padding="19" marginBottom="22">
              <label text="✓  Nothing due yet" color={ink} fontSize="15" fontWeight="700"/>
              <label text="Confirm a deadline and it will appear here." color={muted} fontSize="12" marginTop="7" textWrap={true}/>
            </stacklayout>
          {:else}
            {#each deadlines.slice(0,3) as item (item.documentId)}
              <stacklayout backgroundColor={white} borderRadius="14" padding="14" marginBottom="8" on:tap={()=>openSaved(item)}>
                <label text={item.title} color={ink} fontSize="15" fontWeight="700" textWrap={true}/>
                <label text={item.dueDate+'   ·   '+(item.amount?item.amount+' '+item.currency:'Confirmed deadline')} color={accent} fontSize="12" marginTop="7"/>
              </stacklayout>
            {/each}
          {/if}
          <gridlayout columns="*,auto" marginBottom="12">
            <label col={0} text="Recent documents" color={ink} fontWeight="700" fontSize="17"/>
            <label col={1} text="View library  ›" color={accent} fontSize="13" on:tap={()=>changeTab('documents')}/>
          </gridlayout>
          {#if recent.length===0}
            <stacklayout backgroundColor={white} borderRadius="15" padding="19">
              <label text="Your space is ready" color={ink} fontSize="15" fontWeight="700"/>
              <label text="Import a document or add text to get started." color={muted} fontSize="12" marginTop="7" textWrap={true}/>
            </stacklayout>
          {:else}
            {#each recent as doc (doc.id)}
              <stacklayout backgroundColor={white} borderRadius="13" padding="13" marginBottom="8" on:tap={()=>open(doc)}>
                <label text={'▤   '+doc.name} color={ink} fontWeight="700" fontSize="14"/>
                <label text={reviewedIds.includes(doc.id)?'Reviewed  ✓':'Tap to review'} color={muted} fontSize="11" marginTop="4"/>
              </stacklayout>
            {/each}
          {/if}
        {:else if view==='documents'}
          <label text="YOUR LIBRARY" color={muted} fontWeight="700" fontSize="11"/>
          <label text="All documents" color={ink} fontWeight="700" fontSize="29" marginTop="7"/>
          <label text="Search scans and reviewed paperwork." color={muted} fontSize="13" marginTop="4" marginBottom="15"/>
          <textField text={q} hint="Search your documents..." backgroundColor={white} borderRadius="11" padding="12" on:textChange={e=>q=e.object.text}/>
          <mdbutton text="↻ Refresh scanned documents" color={accent} backgroundColor={mint} on:tap={refresh} marginTop="10" marginBottom="18"/>
          {#if loading}<activityIndicator busy={true}/>{/if}
          {#if library.length===0}
            <stacklayout backgroundColor={white} borderRadius="17" padding="22">
              <label text="No documents found" fontSize="17" fontWeight="700" color={ink}/>
              <label text="Return to the scanner to import a PDF, or add an OCR text sample." color={muted} fontSize="13" marginTop="9" textWrap={true}/>
            </stacklayout>
          {:else}
            {#each library as doc (doc.id)}
              <stacklayout backgroundColor={white} borderRadius="14" padding="15" marginBottom="9" on:tap={()=>open(doc)}>
                <label text={'▤  '+doc.name} color={ink} fontWeight="700" fontSize="15" textWrap={true}/>
                <label text={(doc.manual?'Manual entry':doc.pageCount+' page(s)')+'  ·  '+(reviewedIds.includes(doc.id)?'Reviewed':'To review')} color={muted} fontSize="12" marginTop="8"/>
              </stacklayout>
            {/each}
          {/if}
        {:else if view==='add'}
          <label text="CAPTURE & ORGANIZE" color={muted} fontWeight="700" fontSize="11"/>
          <label text="Add a document" color={ink} fontWeight="700" fontSize="29" marginTop="7"/>
          <label text="Keep using the scanner for PDFs and images, or paste OCR text to test the local extraction rules." color={muted} fontSize="13" textWrap={true} marginTop="6" marginBottom="19"/>
          <stacklayout backgroundColor={white} borderRadius="16" padding="17" marginBottom="16">
            <label text="01   Import a scan or PDF" color={ink} fontWeight="700" fontSize="17"/>
            <label text="Open the original scanner, choose Import, then run OCR. Return to HomeDoc for review." color={muted} fontSize="12" marginTop="10" textWrap={true}/>
            <mdbutton text="Open scanner for PDF import  ›" backgroundColor={mint} color={accent} marginTop="13" on:tap={openScanner}/>
          </stacklayout>
          <stacklayout backgroundColor={white} borderRadius="16" padding="17">
            <label text="02   Test with extracted text" color={ink} fontWeight="700" fontSize="17"/>
            <label text="Title" color={muted} fontSize="12" marginTop="13"/>
            <textField text={manualTitle} hint="TARI — July 2027" backgroundColor="#F5F8F7" borderRadius="10" padding="10" on:textChange={e=>manualTitle=e.object.text}/>
            <label text="OCR text" color={muted} fontSize="12" marginTop="13"/>
            <textview text={manualText} hint="Paste the words from your sample document..." height="165" backgroundColor="#F5F8F7" borderRadius="10" padding="10" on:textChange={e=>manualText=e.object.text}/>
            <mdbutton text="Analyze text  →" color={white} backgroundColor={accent} marginTop="13" on:tap={addFromText}/>
            <label text="Only confirmed metadata is saved. Pasted text is not persisted." color={muted} fontSize="10" textWrap={true} marginTop="7"/>
          </stacklayout>
        {:else if view==='dates'}
          <label text="WHAT'S NEXT" color={muted} fontWeight="700" fontSize="11"/>
          <label text="Important dates" color={ink} fontWeight="700" fontSize="29" marginTop="7"/>
          <label text="Only deadlines you personally confirmed appear here." color={muted} fontSize="13" marginTop="7" marginBottom="17" textWrap={true}/>
          {#if deadlines.length===0}
            <stacklayout backgroundColor={white} borderRadius="16" padding="20">
              <label text="✓  All clear" color={ink} fontWeight="700" fontSize="16"/>
              <label text="No confirmed dates at the moment." color={muted} fontSize="12" marginTop="9"/>
            </stacklayout>
          {:else}
            {#each deadlines as item (item.documentId)}
              <stacklayout backgroundColor={white} borderRadius="14" padding="16" marginBottom="9" on:tap={()=>openSaved(item)}>
                <label text={item.title} color={ink} fontSize="15" fontWeight="700"/>
                <label text={'Due: '+item.dueDate} color={accent} fontWeight="700" fontSize="13" marginTop="7"/>
                <label text={item.amount?item.amount+' '+item.currency:''} color={muted} fontSize="12" marginTop="4"/>
              </stacklayout>
            {/each}
          {/if}
          <stacklayout backgroundColor={white} padding="17" borderRadius="14" marginTop="15">
            <label text="Calendar export" fontSize="16" fontWeight="700" color={ink}/>
            <label text="This Android MVP lists dates but does not create calendar events or notifications automatically." fontSize="12" color={muted} textWrap={true} marginTop="8"/>
          </stacklayout>
        {:else if view==='settings'}
          <label text="SECURITY & CONTROLS" color={muted} fontSize="11" fontWeight="700"/>
          <label text="Privacy first" color={ink} fontWeight="700" fontSize="29" marginTop="7"/>
          <label text="Offline extraction happens on your device. Cloud AI remains optional and requires your consent." color={muted} fontSize="13" textWrap={true} marginTop="8" marginBottom="19"/>
          <stacklayout backgroundColor={white} borderRadius="16" padding="17" marginBottom="15">
            <label text="OCR quality" color={ink} fontSize="19" fontWeight="700"/>
            <label text="Choose a real offline Tesseract model for future document scans." color={muted} fontSize="12" textWrap={true} marginTop="6" marginBottom="15"/>
            <gridlayout columns="*,*,*" columnSpacing="8">
              <stacklayout col={0} on:tap={()=>selectOCRQuality('fast')} backgroundColor={ocrQuality==='fast'?mint:'#F6F8F7'} borderWidth="1" borderColor={ocrQuality==='fast'?accent:'#E1E9E5'} borderRadius="12" padding="12">
                <label text={ocrQuality==='fast'?'✓ Low':'Low'} textAlignment="center" color={accent} fontWeight="700" fontSize="15"/>
                <label text="Fast" textAlignment="center" color={muted} fontSize="11" marginTop="5"/>
              </stacklayout>
              <stacklayout col={1} on:tap={()=>selectOCRQuality('standard')} backgroundColor={ocrQuality==='standard'?mint:'#F6F8F7'} borderWidth="1" borderColor={ocrQuality==='standard'?accent:'#E1E9E5'} borderRadius="12" padding="12">
                <label text={ocrQuality==='standard'?'✓ Medium':'Medium'} textAlignment="center" color={accent} fontWeight="700" fontSize="15"/>
                <label text="Balanced" textAlignment="center" color={muted} fontSize="11" marginTop="5"/>
              </stacklayout>
              <stacklayout col={2} on:tap={()=>selectOCRQuality('best')} backgroundColor={ocrQuality==='best'?mint:'#F6F8F7'} borderWidth="1" borderColor={ocrQuality==='best'?accent:'#E1E9E5'} borderRadius="12" padding="12">
                <label text={ocrQuality==='best'?'✓ High':'High'} textAlignment="center" color={accent} fontWeight="700" fontSize="15"/>
                <label text="Accurate" textAlignment="center" color={muted} fontSize="11" marginTop="5"/>
              </stacklayout>
            </gridlayout>
            <label text={ocrQualityDescription} color={ink} fontSize="12" textWrap={true} marginTop="15"/>
            <label text={'OCR languages: '+ocrLanguageNames} color={muted} fontSize="12" textWrap={true} marginTop="9"/>
            <label text={ocrInstalled?'✓ Selected model files installed':'↓ Language model download needed'} color={ocrInstalled?accent:'#A16A28'} fontSize="12" fontWeight="700" textWrap={true} marginTop="9"/>
            <mdbutton text={ocrDownloading?'Preparing OCR models...':'Download missing language files'} isEnabled={!ocrDownloading} backgroundColor={mint} color={accent} marginTop="10" on:tap={downloadOCRModels}/>
            <label text="Changing quality will not update older scans. Run OCR again from the scanner to use the newly selected model." color={muted} fontSize="11" textWrap={true} marginTop="8"/>
          </stacklayout>
          <stacklayout backgroundColor={white} borderRadius="16" padding="19">
            <label text="What this app stores" color={ink} fontSize="17" fontWeight="700"/>
            <label text="• Scans remain in the scanner's local repository.\n• HomeDoc stores confirmed metadata, not OCR bodies.\n• The local metadata store is not yet encrypted." color={muted} fontSize="13" textWrap={true} marginTop="13"/>
            <label text="Only use fabricated sample documents until production security improvements are complete." color="#A35626" backgroundColor="#FFF2DC" borderRadius="10" padding="12" textWrap={true} fontSize="12" marginTop="14"/>
            <mdbutton text="Delete all HomeDoc reviews" color="#A13F38" backgroundColor="#FBECE9" marginTop="16" on:tap={clearData}/>
          </stacklayout>
        {:else if view==='review' && active && hints}
          <label text="DOCUMENT REVIEW" color={muted} fontSize="11" fontWeight="700"/>
          <label text="Check extracted details" color={ink} fontSize="24" fontWeight="700" textWrap={true} marginTop="8"/>
          <label text="Compare every suggestion with the scanned document before saving." color={muted} fontSize="12" marginTop="8" textWrap={true}/>
          <mdbutton text="← Back to documents" backgroundColor={mint} color={accent} marginTop="13" on:tap={()=>changeTab('documents')}/>
          {#each hints.warnings as warning}
            <label text={'⚠ '+warning} color="#955E2B" backgroundColor="#FFF4DF" padding="11" borderRadius="10" textWrap={true} marginTop="9"/>
          {/each}
          <stacklayout backgroundColor={white} borderRadius="17" padding="17" marginTop="14">
            <label text="Document title" color={muted} fontSize="12"/>
            <textField text={draft.title} backgroundColor="#F5F8F7" borderRadius="9" padding="10" on:textChange={e=>update('title',e.object.text)}/>
            <label text="Category" color={muted} fontSize="12" marginTop="12"/>
            <mdbutton text={'Category: '+draft.category+'  ▾'} color={accent} backgroundColor={mint} on:tap={cycleCat}/>
            <label text="Due date (YYYY-MM-DD)" color={muted} fontSize="12" marginTop="12"/>
            <textField text={draft.dueDate} backgroundColor="#F5F8F7" borderRadius="9" padding="10" on:textChange={e=>update('dueDate',e.object.text)}/>
            <label text="Amount" color={muted} fontSize="12" marginTop="12"/>
            <textField text={draft.amount} keyboardType="number" backgroundColor="#F5F8F7" borderRadius="9" padding="10" on:textChange={e=>update('amount',e.object.text)}/>
            <label text="Currency" color={muted} fontSize="12" marginTop="12"/>
            <textField text={draft.currency} backgroundColor="#F5F8F7" borderRadius="9" padding="10" on:textChange={e=>update('currency',e.object.text)}/>
            <mdbutton text="✓ Confirm and save" color={white} backgroundColor={accent} marginTop="16" on:tap={save}/>
            {#if reviewedIds.includes(active.id)}
              <mdbutton text="Remove this review" color="#A13F38" backgroundColor="#FBECE9" marginTop="8" on:tap={forgetRecord}/>
            {/if}
          </stacklayout>
          {#if active.text}
            <stacklayout backgroundColor={white} borderRadius="15" padding="16" marginTop="14">
              <label text="EXTRACTED SOURCE" color={ink} fontSize="13" fontWeight="700"/>
              <label text={active.text.slice(0,2400)} color={muted} backgroundColor="#F5F8F7" fontSize="12" textWrap={true} padding="12" marginTop="10"/>
              <mdbutton text={aiBusy?'Working...':'Optional: analyze with cloud AI'} isEnabled={!aiBusy} color={accent} backgroundColor={mint} marginTop="10" on:tap={cloudAI}/>
            </stacklayout>
          {/if}
        {/if}
        {#if error}
          <label text={error} color="#A13F38" backgroundColor="#FFF0EE" borderRadius="11" padding="12" textWrap={true} fontSize="12" marginTop="12"/>
        {/if}
        <label text="HomeDoc AI • Offline MVP • No automatic notifications" color={muted} fontSize="10" textAlignment="center" textWrap={true} marginTop="24" marginBottom="17"/>
      </stacklayout>
    </scrollview>
    <gridlayout row={2} columns="*,*,*,*,*" backgroundColor={white} paddingTop="7" paddingBottom="8" height="67">
      <stacklayout col={0} on:tap={()=>changeTab('home')} horizontalAlignment="center" width="100%">
        <label text="⌂" color={view==='home'?accent:muted} fontSize="21" textAlignment="center"/>
        <label text="Home" color={view==='home'?accent:muted} fontSize="10" textAlignment="center"/>
      </stacklayout>
      <stacklayout col={1} on:tap={()=>changeTab('documents')} horizontalAlignment="center" width="100%">
        <label text="▤" color={view==='documents'?accent:muted} fontSize="20" textAlignment="center"/>
        <label text="Documents" color={view==='documents'?accent:muted} fontSize="10" textAlignment="center"/>
      </stacklayout>
      <stacklayout col={2} on:tap={()=>changeTab('add')} horizontalAlignment="center" width="100%">
        <label text="⊕" color={view==='add'?accent:muted} fontSize="21" textAlignment="center"/>
        <label text="Add" color={view==='add'?accent:muted} fontSize="10" textAlignment="center"/>
      </stacklayout>
      <stacklayout col={3} on:tap={()=>changeTab('dates')} horizontalAlignment="center" width="100%">
        <label text="▦" color={view==='dates'?accent:muted} fontSize="20" textAlignment="center"/>
        <label text="Dates" color={view==='dates'?accent:muted} fontSize="10" textAlignment="center"/>
      </stacklayout>
      <stacklayout col={4} on:tap={()=>changeTab('settings')} horizontalAlignment="center" width="100%">
        <label text="⚙" color={view==='settings'?accent:muted} fontSize="20" textAlignment="center"/>
        <label text="Settings" color={view==='settings'?accent:muted} fontSize="10" textAlignment="center"/>
      </stacklayout>
    </gridlayout>
  </gridlayout>
</page>
