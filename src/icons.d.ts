// com o compiler "raw" do unplugin-icons, cada ícone é importado como string SVG
declare module "~icons/*" {
  const svg: string;
  export default svg;
}
