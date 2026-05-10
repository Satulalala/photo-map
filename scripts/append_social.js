const fs = require('fs');
const path = 'd:/Project/photo-map-main/src/components/SocialPanel.jsx';
const append = `
    </div>
  );
}

function ProvinceView({ stats, bc, onCity }) {
  return (
    <div className='social-page'>
      {bc}
      <div className='social-section'>
        <h3>\u4e2d\u56fd\u7701\u4efd</h3>
        <div className='social-overview-cards'>
          <div className='soc-card'><div className='soc-card-icon'>\u2705</div><div className='soc-card-value'>{stats.visitedCount}</div><div className='soc-card-label'>\u5df2\u5230\u8bbf</div></div>
          <div className='soc-card'><div className='soc-card-icon'>\u29bf</div><div className='soc-card-value'>{stats.unvisited.length}</div><div className='soc-card-label'>\u672a\u5230\u8bbf</div></div>
          <div className='soc-card'><div className='soc-card-icon'>\ud83d\udccd</div><div className='soc-card-value'>{stats.totalMarkers}</div><div className='soc-card-label'>\u603b\u6807\u8bb0</div></div>
          <div className='soc-card'><div className='soc-card-icon'>\ud83c\udf0f</div><div className='soc-card-value'>{stats.coverage}%</div><div className='soc-card-label'>\u8986\u76d6\u7387</div></div>
        </div>
      </div>
      {stats.sortedProvinces.length>0&&(
        <div className='social-section'>
          <h3>\ud83c\udfc6 \u5df2\u5230\u8bbf\u7701\u4efd\uff08\u70b9\u51fb\u67e5\u770b\u57ce\u5e02\uff09</h3>
          <div className='province-drill-list'>
            {stats.sortedProvinces.map(([p,count],i)=>(
              <div key={p} className='province-drill-item' onClick={()=>onCity(p)}>
                <span className='pdl-rank'>{i<3?['\ud83e\udd47','\ud83e\udd48','\ud83e\udd49'][i]:i+1}</span>
                <span className='pdl-name'>{p}</span>
                <div className='pdl-bar-wrap'><div className='pdl-bar' style={{width:\`\${Math.min(100,count/stats.sortedProvinces[0][1]*100)}%\`}}/></div>
                <span className='pdl-count'>{count}\u4e2a</span>
                <span className='pdl-arrow'>\u203a</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {stats.unvisited.length>0&&(
        <div className='social-section'>
          <h3>\ud83d\uddfa\ufe0f \u672a\u5230\u8bbf\u7701\u4efd</h3>
          <div className='province-tags'>{stats.unvisited.map(p=><span key={p} className='province-tag unvisited'>{p}</span>)}</div>
        </div>
      )}
    </div>
  );
}

function CityView({ stats, province, bc }) {
  const cities = stats.provinceCities[province]||{};
  const sorted = Object.entries(cities).sort((a,b)=>b[1]-a[1]);
  return (
    <div className='social-page'>
      {bc}
      <div className='social-section'>
        <h3>\ud83d\udccd {province} \u6982\u89c8</h3>
        <div className='social-overview-cards'>
          <div className='soc-card'><div className='soc-card-icon'>\ud83d\udccd</div><div className='soc-card-value'>{stats.provinceCounts[province]||0}</div><div className='soc-card-label'>\u6807\u8bb0\u70b9</div></div>
          <div className='soc-card'><div className='soc-card-icon'>\ud83d\udcf7</div><div className='soc-card-value'>{stats.provincePhotos[province]||0}</div><div className='soc-card-label'>\u7167\u7247</div></div>
          <div className='soc-card'><div className='soc-card-icon'>\ud83c\udfd9\ufe0f</div><div className='soc-card-value'>{sorted.length}</div><div className='soc-card-label'>\u57ce\u5e02</div></div>
        </div>
      </div>
      {sorted.length>0?(
        <div className='social-section'>
          <h3>\ud83c\udfd9\ufe0f \u57ce\u5e02\u5206\u5e03</h3>
          <div className='province-drill-list'>
            {sorted.map(([city,count],i)=>(
              <div key={city} className='province-drill-item no-arrow'>
                <span className='pdl-rank'>{i<3?['\ud83e\udd47','\ud83e\udd48','\ud83e\udd49'][i]:i+1}</span>
                <span className='pdl-name'>{city}</span>
                <div className='pdl-bar-wrap'><div className='pdl-bar' style={{width:\`\${Math.min(100,count/sorted[0][1]*100)}%\`}}/></div>
                <span className='pdl-count'>{count}\u4e2a</span>
              </div>
            ))}
          </div>
        </div>
      ):(<div className='social-section'><div className='empty-hint'><span>\ud83c\udfd9\ufe0f</span><p>\u6682\u65e0\u57ce\u5e02\u7ea7\u6570\u636e</p></div></div>)}
    </div>
  );
}

function FriendsPage() {
  const [showVillageMap, setShowVillageMap] = useState(false);
  const [friends] = useState([]);
  const [villageMembers] = useState([]);
  if (showVillageMap) return (
    <div className='social-page'>
      <button className='back-btn' onClick={()=>setShowVillageMap(false)}>\u2190 \u8fd4\u56de\u597d\u53cb\u9875</button>
      <div className='social-section'>
        <h3>\ud83c\udf0d \u5730\u7403\u5c71\u5171\u4eab\u5730\u56fe</h3>
        <div className='village-map-placeholder'><div className='village-map-hint'><span>\ud83d\uddfa\ufe0f</span><p>\u5730\u7403\u5c71\u5730\u56fe</p><small>\u9080\u8bf7\u597d\u53cb\u52a0\u5165\u540e\uff0c\u5927\u5bb6\u7684\u6807\u8bb0\u5c06\u5728\u8fd9\u91cc\u6c47\u805a</small></div></div>
      </div>
      <div className='social-section'>
        <h3>\ud83d\udc65 \u6751\u6c11\u5217\u8868 ({villageMembers.length})</h3>
        <div className='empty-hint'><span>\ud83c\udf31</span><p>\u8fd8\u6ca1\u6709\u6751\u6c11</p></div>
      </div>
    </div>
  );
  return (
    <div className='social-page'>
      <div className='village-entry-card' onClick={()=>setShowVillageMap(true)}>
        <div className='village-entry-icon'>\ud83c\udf0d</div>
        <div className='village-entry-info'><strong>\u6211\u7684\u5730\u7403\u5c71</strong><small>\u4e0e\u597d\u53cb\u5171\u4eab\u6807\u8bb0 \u00b7 {villageMembers.length} \u4f4d\u6751\u6c11</small></div>
        <span className='village-entry-arrow'>\u2192</span>
      </div>
      <div className='social-section'>
        <div className='social-section-header'><h3>\ud83d\udc65 \u6211\u7684\u597d\u53cb ({friends.length})</h3><button className='add-friend-btn'>+ \u6dfb\u52a0\u597d\u53cb</button></div>
        <div className='empty-hint'><span>\ud83d\udc4b</span><p>\u8fd8\u6ca1\u6709\u597d\u53cb</p></div>
      </div>
    </div>
  );
}

function SocialPanel({ markers, totalPhotos, socialTab, setSocialTab, onClose, user }) {
  return (
    <div className='social-overlay' onClick={onClose}>
      <div className='social-panel' onClick={e=>e.stopPropagation()}>
        <div className='social-header'>
          <div className='social-tabs'>
            <button className={socialTab==='life'?'active':''} onClick={()=>setSocialTab('life')}>\ud83c\udf1f \u751f\u6d3b</button>
            <button className={socialTab==='friends'?'active':''} onClick={()=>setSocialTab('friends')}>\ud83d\udc65 \u597d\u53cb</button>
          </div>
          <button className='social-close' onClick={onClose}>\u2715</button>
        </div>
        <div className='social-content'>
          {socialTab==='life'&&<LifePage markers={markers} totalPhotos={totalPhotos} user={user}/>}
          {socialTab==='friends'&&<FriendsPage/>}
        </div>
      </div>
    </div>
  );
}

export default SocialPanel;
`;
fs.appendFileSync(path, append);
console.log('done', fs.statSync(path).size);
