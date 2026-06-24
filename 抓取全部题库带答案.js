// 中国近代史纲要题库完整抓取脚本（含答案）
// 使用方法：复制粘贴到浏览器 Console 执行

(async function() {
    console.log('🚀 开始抓取题库...\n');
    
    const baseUrl = 'https://lms.dgut.edu.cn/utestapi/questionTraining/student';
    
    // 从当前页面URL获取参数
    const urlParams = new URLSearchParams(window.location.search);
    const traceId = urlParams.get('traceId') || '13960906';
    
    // 从当前路径获取 qstId 和 ocId
    const pathMatch = window.location.hash.match(/questionTrain\/student\/(\d+)\/(\d+)/);
    const qstId = pathMatch ? pathMatch[1] : 5255;
    const ocId = pathMatch ? pathMatch[2] : 159413;
    
    console.log(`📋 题库ID: ${qstId}, 课程ID: ${ocId}, TraceID: ${traceId}`);
    
    const allQuestions = [];
    const answersMap = {}; // 存储答案: questionId -> correctAnswer
    
    // ========== 第一步：获取所有题目 ==========
    console.log('\n📚 第一步：获取题目列表...');
    
    for (let page = 1; page <= 50; page++) {
        try {
            const questionUrl = `${baseUrl}/questionList?qstId=${qstId}&ocId=${ocId}&qtType=1&pn=${page}&ps=30&traceId=${traceId}`;
            
            const response = await fetch(questionUrl, {
                credentials: 'include',
                headers: { 'Accept': 'application/json' }
            });
            
            const data = await response.json();
            
            if (data.code === 1 && data.result && data.result.trainingQuestions) {
                const questions = data.result.trainingQuestions;
                
                if (questions.length === 0) {
                    console.log(`✅ 第 ${page} 页无数据，停止`);
                    break;
                }
                
                questions.forEach((q, idx) => {
                    allQuestions.push({
                        id: q.id,
                        index: (page - 1) * 30 + idx,
                        type: q.type,
                        typeName: q.type === 1 ? '单选' : (q.type === 2 ? '多选' : '判断'),
                        title: q.title.replace(/<br\/>/g, '\n').replace(/<[^>]+>/g, ''),
                        options: q.item.map((opt, i) => ({
                            label: String.fromCharCode(65 + i), // A, B, C, D...
                            text: opt.title.replace(/<[^>]+>/g, '')
                        })),
                        hardlevel: q.hardlevel,
                        correctAnswer: null // 稍后填充
                    });
                });
                
                console.log(`✅ 第 ${page} 页: +${questions.length}题，总计 ${allQuestions.length}题`);
                
                // 延迟避免请求过快
                await new Promise(r => setTimeout(r, 200));
            } else {
                console.log(`⚠️ 第 ${page} 页异常:`, data.message || '未知错误');
                break;
            }
        } catch (error) {
            console.error(`❌ 第 ${page} 页失败:`, error.message);
            break;
        }
    }
    
    console.log(`\n📊 共获取 ${allQuestions.length} 道题目`);
    
    // ========== 第二步：批量获取答案 ==========
    console.log('\n🔑 第二步：获取正确答案...');
    
    // 每道题都提交一个答案（随便选A），然后从返回结果中获取 correctAnswer
    for (let i = 0; i < allQuestions.length; i++) {
        const q = allQuestions[i];
        
        try {
            const answerUrl = `${baseUrl}/answer?traceId=${traceId}`;
            
            const payload = {
                qtId: parseInt(qstId),
                qtType: q.type,
                index: q.index,
                relationId: q.id,
                answer: ["A"]  // 随便提交一个答案
            };
            
            const response = await fetch(answerUrl, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            const data = await response.json();
            
            if (data.code === 1 && data.result) {
                const correctAnswer = data.result.correctAnswer;
                q.correctAnswer = correctAnswer;
                answersMap[q.id] = correctAnswer;
                
                if ((i + 1) % 10 === 0 || i === allQuestions.length - 1) {
                    console.log(`✅ 已获取 ${i + 1}/${allQuestions.length} 题答案`);
                }
            } else {
                console.log(`⚠️ 第 ${i + 1} 题获取答案失败:`, data.message);
            }
            
            // 延迟避免请求过快
            await new Promise(r => setTimeout(r, 150));
            
        } catch (error) {
            console.error(`❌ 第 ${i + 1} 题请求失败:`, error.message);
        }
    }
    
    // ========== 第三步：整理并导出 ==========
    console.log('\n💾 第三步：整理数据...');
    
    // 分类统计
    const singleChoice = allQuestions.filter(q => q.type === 1);
    const multiChoice = allQuestions.filter(q => q.type === 2);
    const judgment = allQuestions.filter(q => q.type === 3);
    
    console.log(`\n📈 题库统计:`);
    console.log(`   单选题: ${singleChoice.length} 道`);
    console.log(`   多选题: ${multiChoice.length} 道`);
    console.log(`   判断题: ${judgment.length} 道`);
    console.log(`   总计: ${allQuestions.length} 道`);
    
    // 生成导出数据
    const exportData = {
        title: '中国近现代史纲要题库',
        total: allQuestions.length,
        timestamp: new Date().toLocaleString('zh-CN'),
        questions: allQuestions.map(q => ({
            序号: q.index + 1,
            题型: q.typeName,
            难度: q.hardlevel,
            题目: q.title,
            选项A: q.options[0]?.text || '',
            选项B: q.options[1]?.text || '',
            选项C: q.options[2]?.text || '',
            选项D: q.options[3]?.text || '',
            正确答案: q.correctAnswer ? q.correctAnswer.join(',') : '未获取'
        }))
    };
    
    // 保存到 localStorage
    localStorage.setItem('questionBankComplete', JSON.stringify(exportData));
    
    console.log('\n✅ 抓取完成！');
    console.log('\n📋 导出方式:');
    console.log('1. 复制完整JSON:');
    console.log('   copy(JSON.parse(localStorage.getItem("questionBankComplete")))');
    console.log('\n2. 或者复制下面的数据:');
    
    // 输出JSON到控制台
    console.log('\n========== 题库数据 ==========');
    console.log(JSON.stringify(exportData, null, 2));
    
    return exportData;
})();
