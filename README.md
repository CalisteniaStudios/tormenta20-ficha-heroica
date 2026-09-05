# Tormenta20: Ficha Heroica

Ficha alternativa de personagem para **Tormenta20 1.5.015 ou superior**, compatível com **Foundry VTT 13 e 14**.

Os componentes visuais internos da ficha são cópias isoladas da ficha oficial do Tormenta20, criada por Victor Hugo Paiva. A base visual permanece na **v1.5.015**, enquanto perícias e efeitos usam automaticamente os modelos compatíveis com a **v1.6.1** quando o mundo está no Foundry VTT 14. Isso evita que módulos que substituam os templates globais da ficha padrão alterem também a Ficha Heroica. Os dados, rolagens, itens e automações continuam sendo processados pelo sistema Tormenta20 instalado.

O módulo mantém as rolagens, recursos, inventário, poderes, magias, efeitos e automações da ficha oficial. Ele apenas registra uma nova apresentação visual, sem substituir arquivos do sistema.

## Instalação

Manifesto para instalação pelo Foundry VTT:

`https://github.com/CalisteniaStudios/tormenta20-ficha-heroica/releases/latest/download/module.json`

1. Feche o Foundry VTT.
2. Copie a pasta `tormenta20-ficha-heroica` para `Data/modules` dentro da pasta de dados do Foundry.
3. Abra o mundo de Tormenta20 e ative **Tormenta20: Ficha Heroica** em **Gerenciar Módulos**.
4. Abra uma personagem, acesse a configuração da ficha e selecione **Ficha Heroica**.

Para aproveitar o painel lateral, use a arte de corpo inteiro da personagem como imagem da ficha.

- O seletor **Avatar/Token**, com o Olho da Tormenta deslizante, alterna entre a imagem da personagem e a imagem configurada no protótipo do token.
- Clique na imagem grande ou no botão **Ajustar** para configurar a escala e a posição horizontal/vertical. Cada imagem mantém seu próprio enquadramento.
- Clique na logo **Tormenta20** para editar o texto da campanha e escolher entre os temas Rubro, Arcano, Azul, Esmeralda, Ouro ou uma cor personalizada.
- Armas, itens, poderes e magias marcados como favoritos aparecem na primeira aba da ficha, como na ficha padrão do Tormenta20.
- Perícias e efeitos de uso adotam automaticamente a estrutura correta do Tormenta20 1.5.015 ou 1.6.1.
- A barra de categorias permanece centralizada mesmo quando uma aba opcional, como Magias, não está disponível.
- Cada cartão do Diário possui um botão para expandir a anotação e usar toda a área da ficha.
- Ao expandir uma anotação, o campo de edição também cresce e aproveita todo o espaço disponível.
- O avatar ou token é dimensionado automaticamente pela proporção real da imagem para preencher a moldura em `1×`, sem pré-recortar a imagem. Reduzir a escala em **Ajustar** revela as áreas que ficaram fora da moldura, enquanto o fundo integrado continua preenchendo os espaços.
- As preferências visuais ficam salvas individualmente para cada usuário.

## Desinstalação ou retorno à ficha padrão

Na configuração da ficha da personagem, selecione novamente **Ficha de Personagem** ou **Ficha de Personagem - Abas**. Depois disso, o módulo pode ser desativado sem afetar os dados.

## Observações

- Compatibilidade alvo: Foundry VTT 13–14 e Tormenta20 1.5.015 ou superior.
- A ficha foi criada como módulo separado para não ser sobrescrita por atualizações do sistema.
- As marcas incluídas foram fornecidas como material de referência para uso nesta mesa. Verifique as permissões dos respectivos autores antes de redistribuir publicamente o módulo.
