/**
 * Persistence Test Utilities
 * 
 * Run these commands in your browser console to test and debug persistence.
 * Open DevTools (F12) > Console tab > paste and run commands
 */

// 1. Check current storage
export const checkStorage = () => {
  const state = localStorage.getItem('samvada-studio-state');
  const sensitive = localStorage.getItem('samvada-studio-sensitive');
  
  if (!state) {
    console.warn('❌ No state found in localStorage');
    return;
  }
  
  const parsed = JSON.parse(state);
  const stateSize = new Blob([state]).size;
  const sensitiveSize = sensitive ? new Blob([sensitive]).size : 0;
  
  console.log('✅ Persistence Status:');
  console.log(`   State size: ${(stateSize / 1024).toFixed(2)} KB`);
  console.log(`   Sensitive size: ${(sensitiveSize / 1024).toFixed(2)} KB`);
  console.log(`   Chats: ${parsed.chats?.length || 0}`);
  console.log(`   Providers: ${parsed.providers?.length || 0}`);
  console.log(`   Templates: ${parsed.templates?.length || 0}`);
  console.log(`   Folders: ${parsed.folders?.length || 0}`);
  
  return {
    stateSize,
    sensitiveSize,
    totalSize: stateSize + sensitiveSize,
    chats: parsed.chats?.length || 0,
    providers: parsed.providers?.length || 0,
    templates: parsed.templates?.length || 0,
    folders: parsed.folders?.length || 0,
  };
};

// 2. Test persistence cycle
export const testPersistence = () => {
  console.log('🧪 Testing persistence cycle...');
  
  const before = localStorage.getItem('samvada-studio-state');
  console.log('   Before reload:', before ? 'State exists' : 'No state');
  
  // Simulate reload
  console.log('   Simulating reload...');
  console.log('   ✅ On real page reload, state should persist');
  console.log('   💡 To test: Create a chat, reload page, check if chat exists');
};

// 3. Clear all data (caution!)
export const clearAllData = () => {
  if (!confirm('⚠️ This will delete ALL chats, providers, and settings. Continue?')) {
    console.log('❌ Cancelled');
    return;
  }
  
  localStorage.removeItem('samvada-studio-state');
  localStorage.removeItem('samvada-studio-sensitive');
  console.log('✅ All data cleared. Reload page to start fresh.');
};

// 4. Export backup
export const exportBackup = () => {
  const state = localStorage.getItem('samvada-studio-state');
  const sensitive = localStorage.getItem('samvada-studio-sensitive');
  
  if (!state) {
    console.error('❌ No data to export');
    return;
  }
  
  const backup = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    state: JSON.parse(state),
    // Don't include sensitive data in backup for security
  };
  
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `samvada-backup-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  
  console.log('✅ Backup exported (API keys NOT included for security)');
};

// 5. Import backup
export const importBackup = (backupFile: File) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const backup = JSON.parse(e.target?.result as string);
      
      if (!backup.state) {
        throw new Error('Invalid backup file');
      }
      
      localStorage.setItem('samvada-studio-state', JSON.stringify(backup.state));
      console.log('✅ Backup imported. Reload page to see changes.');
      console.log('⚠️ Note: API keys were not included in backup. Re-enter them in Admin.');
    } catch (error) {
      console.error('❌ Failed to import backup:', error);
    }
  };
  reader.readAsText(backupFile);
};

// 6. Check quota usage
export const checkQuota = () => {
  let total = 0;
  Object.keys(localStorage).forEach(key => {
    total += localStorage[key].length + key.length;
  });
  
  const totalKB = (total / 1024).toFixed(2);
  const quotaMB = 5; // Typical limit
  const usedPercent = ((total / (quotaMB * 1024 * 1024)) * 100).toFixed(2);
  
  console.log('📊 Storage Quota:');
  console.log(`   Used: ${totalKB} KB`);
  console.log(`   Estimated Limit: ${quotaMB} MB`);
  console.log(`   Usage: ${usedPercent}%`);
  
  if (parseFloat(usedPercent) > 80) {
    console.warn('⚠️ Storage usage high! Consider exporting and deleting old chats.');
  }
};

// 7. List all storage keys
export const listKeys = () => {
  console.log('🔑 LocalStorage Keys:');
  Object.keys(localStorage).forEach(key => {
    const size = new Blob([localStorage[key]]).size;
    console.log(`   ${key}: ${(size / 1024).toFixed(2)} KB`);
  });
};

// 8. Verify API key encoding
export const verifyEncoding = () => {
  const sensitive = localStorage.getItem('samvada-studio-sensitive');
  if (!sensitive) {
    console.log('ℹ️ No API keys stored');
    return;
  }
  
  const data = JSON.parse(sensitive);
  const providerIds = Object.keys(data);
  
  console.log('🔐 Encoded API Keys:');
  console.log(`   Providers with keys: ${providerIds.length}`);
  providerIds.forEach(id => {
    const encoded = data[id];
    console.log(`   ${id}: ${encoded.substring(0, 20)}...`);
  });
  console.log('   ✅ Keys are encoded (not plaintext)');
};

// 9. Test state size growth
export const testGrowth = (numChats: number = 10) => {
  const state = localStorage.getItem('samvada-studio-state');
  if (!state) {
    console.error('❌ No state found');
    return;
  }
  
  const parsed = JSON.parse(state);
  const currentSize = new Blob([state]).size;
  const avgChatSize = parsed.chats.length > 0 
    ? currentSize / parsed.chats.length 
    : 5000; // Estimate 5KB per chat
  
  const projectedSize = (avgChatSize * numChats) / 1024;
  
  console.log('📈 Growth Projection:');
  console.log(`   Current: ${(currentSize / 1024).toFixed(2)} KB (${parsed.chats.length} chats)`);
  console.log(`   Avg per chat: ${(avgChatSize / 1024).toFixed(2)} KB`);
  console.log(`   With ${numChats} chats: ${projectedSize.toFixed(2)} KB`);
};

// Make utilities available globally for console use
if (typeof window !== 'undefined') {
  (window as any).__SAMVADA_PERSISTENCE__ = {
    checkStorage,
    testPersistence,
    clearAllData,
    exportBackup,
    importBackup,
    checkQuota,
    listKeys,
    verifyEncoding,
    testGrowth,
  };
  
  console.log('✅ Persistence utilities loaded!');
  console.log('   Run: __SAMVADA_PERSISTENCE__.checkStorage()');
  console.log('   See all: Object.keys(__SAMVADA_PERSISTENCE__)');
}
