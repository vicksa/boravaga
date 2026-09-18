export type Job = { id:string; title:string; company:string; location:string; level:string; type:string; mode:string; area:string; salary:string; source:string; url:string; description:string; tags:string[]; checked:string; demo?:boolean };
const rows = [
["Desenvolvedor(a) front-end júnior","Órbita Digital","São Paulo, SP","Júnior","CLT","Remoto","Tecnologia","R$ 3.500 – R$ 5.000","React,TypeScript,CSS"],
["Estágio em desenvolvimento de software","Ponto Tech","Bauru, SP","Não informado","Estágio","Híbrido","Tecnologia","R$ 1.500 – R$ 2.000","JavaScript,Git,Lógica"],
["Analista de dados pleno","Nexo Analytics","Brasil","Pleno","CLT","Remoto","Dados","R$ 6.000 – R$ 8.000","Python,SQL,Power BI"],
["Assistente de marketing","Estúdio Aurora","Lins, SP","Júnior","CLT","Presencial","Marketing","R$ 2.200 – R$ 2.800","Redes sociais,Canva,Conteúdo"],
["Desenvolvedor(a) back-end pleno","Vértice Sistemas","Campinas, SP","Pleno","PJ","Remoto","Tecnologia","R$ 7.000 – R$ 9.000","Python,PostgreSQL,Docker"],
["Estágio em administração","Horizonte Gestão","Lins, SP","Não informado","Estágio","Presencial","Administração","R$ 1.200 – R$ 1.600","Excel,Organização,Atendimento"],
["Product designer sênior","Forma Studio","São Paulo, SP","Sênior","CLT","Híbrido","Design","Salário não informado","Figma,Pesquisa,Design systems"],
["Analista de qualidade júnior","Ponto Tech","Brasil","Júnior","CLT","Remoto","Tecnologia","R$ 3.000 – R$ 4.500","Testes,SQL,Agile"]
];
export const demoJobs:Job[]=rows.map((r,i)=>({id:`demo-${i}`,title:r[0],company:r[1],location:r[2],level:r[3],type:r[4],mode:r[5],area:r[6],salary:r[7],tags:r[8].split(","),source:"Demonstração",url:"",checked:"",demo:true,description:`Exemplo fictício para testar a plataforma. Nesta posição de ${r[0].toLowerCase()}, você trabalharia com ${r[8].replaceAll(",",", ")}. Os requisitos, a empresa e a remuneração são ilustrativos. Não há candidatura disponível.`}));
export const fold=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
