export function parseCSV(text){
 if(typeof text!=='string'||text.length>2000000)throw Error('CSV is too large.');text=text.replace(/^\uFEFF/,'');const rows=[];let row=[],field='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'){if(text[i+1]==='"'){field+='"';i++;}else quoted=false;}else field+=c;}else if(c==='"'){if(field)throw Error('Invalid CSV quote.');quoted=true;}else if(c===','){row.push(field);field='';}else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(x=>x!==''))rows.push(row);row=[];field='';}else field+=c;}
 if(quoted)throw Error('Unclosed CSV quote.');row.push(field);if(row.some(x=>x!==''))rows.push(row);if(rows.length>20000)throw Error('Too many CSV rows.');return rows;
}
