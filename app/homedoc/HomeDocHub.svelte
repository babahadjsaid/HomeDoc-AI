<script lang="ts">
    import { onMount } from 'svelte';
    import { alert, confirm, prompt } from '@nativescript-community/ui-material-dialogs';
    import { documentsService } from '~/services/documents';
    import { analyzeOcrText, isValidIsoDate } from './analyzer.mjs';
    import { getRecords, removeRecord, upsertRecord, type HomeDocCategory, type HomeDocRecord } from './store';

    type ScannedDoc = { id: string; name: string; text: string; pageCount: number };
    const categories: HomeDocCategory[] = ['bill', 'receipt', 'warranty', 'insurance', 'letter', 'other'];
    const ink = '#182B3C', secondary = '#667788', accent = '#156B6A';
    let documents: ScannedDoc[] = [];
    let records: HomeDocRecord[] = getRecords();
    let selection: ScannedDoc | null = null;
    let proposal: ReturnType<typeof analyzeOcrText> | null = null;
    let draft = { title: '', category: 'other' as HomeDocCategory, dueDate: '', amount: '', currency: '' };
    let error = '';
    let loading = false;
    let showList = true;
    let aiBusy = false;
    $: dueCount = records.filter(r => !!r.dueDate).length;

    onMount(() => { refreshDocuments(); });
    async function refreshDocuments() {
        loading = true;
        error = '';
        try {
            const list = await documentsService.documentRepository.findDocuments();
            documents = list.map(d => ({
                id: String(d.id), name: d.name || 'Untitled document',
                text: (d.pages || []).map(p => p.ocrData?.text || '').join('\n'),
                pageCount: (d.pages || []).length
            }));
        } catch (e) {
            error = 'Unable to load scanned documents. Open the scanner again and retry.';
            console.error('HomeDoc load', e);
        } finally { loading = false; }
    }
    function choose(doc: ScannedDoc) {
        selection = doc;
        proposal = analyzeOcrText(doc.text, doc.name);
        const saved = records.find(r => r.documentId === doc.id);
        draft = saved ? {
            title:saved.title, category:saved.category, dueDate:saved.dueDate,
            amount:saved.amount, currency:saved.currency
        } : {
            title:proposal.title, category: proposal.category as HomeDocCategory,
            dueDate: proposal.dueDate, amount:proposal.amount, currency:proposal.currency
        };
        showList = false;
        error = '';
    }
    function edit(field: 'title'|'dueDate'|'amount'|'currency', value: string) {
        draft = {...draft, [field]:value};
    }
    function cycleCategory() {
        draft = {...draft, category:categories[(categories.indexOf(draft.category)+1) % categories.length]};
    }
    async function askCloudAi() {
        if (!selection || !selection.text) {
            error = 'OCR text is required. Run OCR in the scanner first.';
            return;
        }
        const consent = await confirm({
            title:'Optional cloud AI',
            message:'Send the selected document OCR text to a server you configure, which forwards it to an AI provider? Documents may contain sensitive information. No image is uploaded. This is optional.',
            okButtonText:'I consent',cancelButtonText:'Keep offline'
        });
        if (!consent) return;
        const urlPrompt = await prompt({title:'HomeDoc development API',message:'Enter the HTTPS endpoint ending /v1/analyze. Use a local HTTP address only for development.',defaultText:'https://your-server.example/v1/analyze',okButtonText:'Next',cancelButtonText:'Cancel'});
        if (!urlPrompt.result) return;
        const endpoint = urlPrompt.text.trim();
        if (!/^https:\/\/[^\s]+\/v1\/analyze$/.test(endpoint) && !/^http:\/\/(?:localhost|127\.0\.0\.1|192\.168\.[\d.]+|10\.[\d.]+):\d+\/v1\/analyze$/.test(endpoint)) {
            error = 'Use an HTTPS HomeDoc endpoint. HTTP is accepted only for specified local development addresses.';
            return;
        }
        const tokenPrompt = await prompt({title:'Development access token',message:'Enter HOMEDOC_API_TOKEN (not your OpenAI API key). It will not be saved.',inputType:'password',okButtonText:'Analyze',cancelButtonText:'Cancel'});
        if (!tokenPrompt.result || !tokenPrompt.text) return;
        aiBusy = true; error = '';
        try {
            const response = await fetch(endpoint, {
                method:'POST',
                headers:{'Content-Type':'application/json',Authorization:'Bearer ' + tokenPrompt.text},
                body:JSON.stringify({title:selection.name,text:selection.text.slice(0,12000)})
            });
            if (!response.ok) throw new Error('HomeDoc AI server returned HTTP ' + response.status);
            const result = await response.json();
            if (!result || !Array.isArray(result.warnings) || !result.reviewRequired) throw new Error('Unexpected AI response');
            proposal = {...proposal, ...result};
            draft = {
                title:draft.title,
                category:categories.includes(result.category) ? result.category : 'other',
                dueDate:result.dueDate || '',
                amount:result.amount || '',
                currency:result.currency || ''
            };
        } catch (e) { error = 'Cloud AI failed. Offline review is still available. ' + (e?.message || 'Check the server.'); }
        finally { aiBusy = false; }
    }
    async function save() {
        if (!selection) return;
        if (!draft.title.trim()) { error = 'Enter a document title.'; return; }
        if (draft.dueDate && !isValidIsoDate(draft.dueDate.trim())) {
            error = 'Date must be valid YYYY-MM-DD, or left blank.'; return;
        }
        if (draft.amount && !/^\d+(?:\.\d{1,2})?$/.test(draft.amount.trim())) {
            error = 'Amount must be a positive number, such as 12.50.'; return;
        }
        upsertRecord({
            documentId:selection.id, title:draft.title.trim().slice(0,150),
            category:draft.category, dueDate:draft.dueDate.trim(),
            amount:draft.amount.trim(), currency:draft.currency.trim().toUpperCase().slice(0,3),
            savedAt:Date.now(), confirmed:true
        });
        records = getRecords();
        error = '';
        await alert({title:'Review saved',message:'Saved on this device. Deadlines are visible in HomeDoc, but phone notifications are not yet enabled.',okButtonText:'OK'});
        showList = true;
    }
    async function remove() {
        if (!selection) return;
        const ok = await confirm({title:'Delete review?',message:'Only the HomeDoc metadata will be removed. The scanned document stays in the scanner.',okButtonText:'Delete',cancelButtonText:'Cancel'});
        if (!ok) return;
        removeRecord(selection.id);
        records = getRecords();
        showList = true;
    }
    function openRecord(r: HomeDocRecord) {
        const doc = documents.find(d => d.id === r.documentId);
        if (doc) choose(doc);
        else error = 'The original scan is missing. Remove its metadata after restoring the scan.';
    }
</script>

<page actionBarHidden={false} backgroundColor="#F5F8FA">
    <actionBar title="HomeDoc AI" backgroundColor="#FFFFFF" color={ink}>
        <navigationButton text="Back" />
    </actionBar>
    <scrollView>
        <stackLayout padding="18" backgroundColor="#F5F8FA">
            <stackLayout backgroundColor="#133E49" borderRadius="20" padding="20" marginBottom="16">
                <label text="YOUR PAPERWORK, ORGANIZED" color="#BCE1DF" fontSize="11" fontWeight="700" />
                <label text="HomeDoc AI" color="#FFFFFF" fontSize="29" fontWeight="700" marginTop="6" />
                <label text="Scan · Review · Remember" color="#E3F3F3" fontSize="14" marginTop="3" />
                <label text={`${documents.length} scans  ·  ${records.length} reviewed  ·  ${dueCount} deadlines`} color="#FFFFFF" fontSize="12" marginTop="18" />
            </stackLayout>
            <stackLayout backgroundColor="#E7F4EF" borderRadius="12" padding="12" marginBottom="15">
                <label text="OFFLINE REVIEW MODE" fontWeight="700" fontSize="12" color="#17594E" />
                <label text="Suggestions come from simple local OCR rules, not a cloud AI model. Always check dates against the original scan." color="#275B51" fontSize="12" textWrap={true} marginTop="4" />
            </stackLayout>
            {#if error}
                <label text={error} color="#B63B38" backgroundColor="#FFF0EE" borderRadius="10" padding="12" textWrap={true} marginBottom="12" />
            {/if}
            {#if showList}
                <label text="UPCOMING DEADLINES" color={secondary} fontWeight="700" fontSize="12" marginBottom="9" />
                {#if records.filter(r => !!r.dueDate).length === 0}
                    <label text="No confirmed deadlines yet." color={secondary} backgroundColor="#FFFFFF" borderRadius="12" padding="16" marginBottom="18" />
                {:else}
                    {#each records.filter(r => !!r.dueDate) as r (r.documentId)}
                        <stackLayout backgroundColor="#FFFFFF" borderRadius="12" padding="13" marginBottom="8" on:tap={() => openRecord(r)}>
                            <label text={r.title} color={ink} fontWeight="700" fontSize="15" />
                            <label text={`${r.dueDate} · ${r.category}${r.amount ? ' · ' + r.amount + ' ' + r.currency : ''}`} color={secondary} fontSize="12" marginTop="5" />
                        </stackLayout>
                    {/each}
                {/if}
                <label text="YOUR SCANNED DOCUMENTS" color={secondary} fontWeight="700" fontSize="12" marginTop="4" marginBottom="9" />
                {#if loading}
                    <activityIndicator busy={true} />
                {:else if documents.length === 0}
                    <label text="No scans yet. Go back to the scanner, scan a document, and run OCR before opening HomeDoc." color={secondary} textWrap={true} backgroundColor="#FFFFFF" borderRadius="12" padding="16" />
                {:else}
                    {#each documents as doc (doc.id)}
                        <stackLayout backgroundColor="#FFFFFF" borderRadius="12" padding="13" marginBottom="8" on:tap={() => choose(doc)}>
                            <label text={doc.name} color={ink} fontWeight="700" fontSize="15" />
                            <label text={`${doc.pageCount} page(s) · ${doc.text ? 'OCR ready' : 'OCR missing'} · ${records.some(r => r.documentId === doc.id) ? 'Reviewed' : 'Not reviewed'}`} color={secondary} fontSize="12" marginTop="5" />
                        </stackLayout>
                    {/each}
                {/if}
                <button text="↻ Refresh scans" backgroundColor="#E9EFEF" color={accent} on:tap={refreshDocuments} marginTop="9" />
            {:else if selection && proposal}
                <button text="← All documents" backgroundColor="#E9EFEF" color={ink} on:tap={() => {showList = true;error='';}} />
                <label text="REVIEW EXTRACTED FIELDS" fontWeight="700" color={secondary} fontSize="12" marginTop="16" marginBottom="8" />
                <label text={selection.name} fontSize="18" fontWeight="700" color={ink} textWrap={true} marginBottom="10" />
                {#each proposal.warnings as warning}
                    <label text={'⚠ ' + warning} color="#875100" backgroundColor="#FFF5DD" borderRadius="9" padding="10" textWrap={true} marginBottom="6" />
                {/each}
                {#if selection.text}
                    <button text={aiBusy ? 'Analyzing securely…' : 'Optional: Analyze with cloud AI'} isEnabled={!aiBusy} backgroundColor="#DDEDEC" color={accent} on:tap={askCloudAi} marginTop="10" />
                {/if}
                <label text="Document title" color={secondary} fontSize="12" marginTop="10" />
                <textField text={draft.title} hint="Document title" backgroundColor="#FFFFFF" borderRadius="9" padding="10" on:textChange={(e) => edit('title', e.object.text)} />
                <label text="Category" color={secondary} fontSize="12" marginTop="12" />
                <button text={`Category: ${draft.category} (tap to change)`} color={accent} backgroundColor="#E4F1EF" on:tap={cycleCategory} />
                <label text="Due date (YYYY-MM-DD)" color={secondary} fontSize="12" marginTop="12" />
                <textField text={draft.dueDate} hint="2026-12-31 or leave blank" backgroundColor="#FFFFFF" borderRadius="9" padding="10" on:textChange={(e) => edit('dueDate', e.object.text)} />
                <label text="Amount (optional)" color={secondary} fontSize="12" marginTop="12" />
                <textField text={draft.amount} hint="42.50" keyboardType="number" backgroundColor="#FFFFFF" borderRadius="9" padding="10" on:textChange={(e) => edit('amount', e.object.text)} />
                <label text="Currency (optional)" color={secondary} fontSize="12" marginTop="12" />
                <textField text={draft.currency} hint="EUR" backgroundColor="#FFFFFF" borderRadius="9" padding="10" on:textChange={(e) => edit('currency', e.object.text)} />
                <label text="Only save after checking the original scan. This MVP stores reviewed metadata locally without encryption." color={secondary} textWrap={true} fontSize="12" marginTop="14" marginBottom="10" />
                <button text="Confirm & save" color="#FFFFFF" backgroundColor={accent} on:tap={save} />
                {#if records.some(r => r.documentId === selection.id)}
                    <button text="Remove HomeDoc review" color="#B63B38" backgroundColor="#FBEDEC" on:tap={remove} />
                {/if}
            {/if}
            <label text="HomeDoc development MVP · No automatic cloud uploads · No background phone notifications" color={secondary} textWrap={true} textAlignment="center" fontSize="10" marginTop="23" marginBottom="20" />
        </stackLayout>
    </scrollView>
</page>
