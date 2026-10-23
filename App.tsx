
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  PixelRatio,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Sharing from "expo-sharing";
import { captureRef } from "react-native-view-shot";

const CORES = [
  "#FFFFFF", "#FFE135", "#FF8C00", "#E32636",
  "#FF69B4", "#8A2BE2", "#1F3FBF", "#4FB3E8",
  "#1E8B3A", "#7FD13B", "#8B4513", "#000000",
];

const TAMANHO = 16;
const COR_FUNDO = "#FFFFFF";
const CHAVE_SALVAMENTO = "@pixel/desenho";

function corDoTexto(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150
    ? "#111827"
    : "#FFFFFF";
}

export default function App() {
  const { width, height } = useWindowDimensions();

  const tamanhoPixel = Math.floor(
    Math.min((width - 40) / TAMANHO, (height - 230) / TAMANHO, 30)
  );

  const tamanhoPaleta = Math.floor(Math.min((width - 40) / 6, 50));

  const [corAtual, setCorAtual] = useState("#000000");
  const [pixels, setPixels] = useState<string[]>(
    Array(TAMANHO * TAMANHO).fill(COR_FUNDO)
  );
  const [carregando, setCarregando] = useState(true);

  const gradeRef = useRef<React.ElementRef<typeof View>>(null);
  const corAtualRef = useRef(corAtual);

  // Mantém a cor mais recente disponível para os eventos de toque.
  corAtualRef.current = corAtual;

  // Recupera o desenho salvo anteriormente.
  useEffect(() => {
    async function carregar() {
      try {
        const salvo = await AsyncStorage.getItem(CHAVE_SALVAMENTO);

        if (salvo) {
          const dados: unknown = JSON.parse(salvo);

          if (
            Array.isArray(dados) &&
            dados.length === TAMANHO * TAMANHO &&
            dados.every(
              (cor) =>
                typeof cor === "string" &&
                /^#[0-9a-fA-F]{6}$/.test(cor)
            )
          ) {
            setPixels(dados);
          }
        }
      } catch (erro) {
        console.error("Erro ao carregar desenho:", erro);
      } finally {
        setCarregando(false);
      }
    }

    carregar();
  }, []);

  // Salva automaticamente as alterações.
  useEffect(() => {
    if (carregando) return;

    AsyncStorage.setItem(CHAVE_SALVAMENTO, JSON.stringify(pixels)).catch(
      (erro) => console.error("Erro ao salvar desenho:", erro)
    );
  }, [pixels, carregando]);

  // Cada quadrado informa diretamente seu próprio índice.
  function pintarPixel(index: number) {
    const cor = corAtualRef.current;

    setPixels((anteriores) => {
      if (anteriores[index] === cor) return anteriores;

      const novas = [...anteriores];
      novas[index] = cor;
      return novas;
    });
  }

  function limpar() {
    Alert.alert("Limpar desenho", "Quer apagar todos os pixels?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Limpar",
        style: "destructive",
        onPress: () => setPixels(Array(TAMANHO * TAMANHO).fill(COR_FUNDO)),
      },
    ]);
  }

  async function compartilhar() {
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert(
          "Indisponível",
          "O compartilhamento não está disponível neste ambiente."
        );
        return;
      }

      if (!gradeRef.current) {
        Alert.alert("Ops!", "A grade ainda não está pronta.");
        return;
      }

      const densidade = PixelRatio.get();
      const dimensao = 1080 / densidade;

      const uri = await captureRef(gradeRef.current, {
        format: "png",
        result: "tmpfile",
        width: dimensao,
        height: dimensao,
      });

      await Sharing.shareAsync(uri, {
        mimeType: "image/png",
        dialogTitle: "Compartilhar desenho",
        UTI: "public.png",
      });
    } catch (erro) {
      console.error("Erro ao exportar:", erro);
      Alert.alert("Ops!", "Não foi possível exportar o desenho.");
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={styles.conteudo}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.titulo}>Pixel</Text>
        <Text style={styles.subtitulo}>
          Sua criatividade, pixel por pixel.
        </Text>

        <View style={styles.secao}>
          <Text style={styles.rotulo}>ESCOLHA UMA COR</Text>

          <View style={[styles.paleta, { width: tamanhoPaleta * 6 }]}>
            {CORES.map((cor) => {
              const selecionada = cor === corAtual;

              return (
                <TouchableOpacity
                  key={cor}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={`Selecionar cor ${cor}`}
                  onPress={() => setCorAtual(cor)}
                  style={{
                    width: tamanhoPaleta,
                    height: tamanhoPaleta,
                    backgroundColor: cor,
                    borderWidth: selecionada ? 3 : 1,
                    borderColor: selecionada ? "#2563EB" : "#D1D5DB",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {selecionada && (
                    <Text
                      style={{
                        color: corDoTexto(cor),
                        fontSize: 20,
                        fontWeight: "900",
                      }}
                    >
                      X
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.corSelecionada}>
            Cor selecionada: {corAtual}
          </Text>

          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => setCorAtual(COR_FUNDO)}
            style={[
              styles.botaoBorracha,
              {
                borderColor: corAtual === COR_FUNDO ? "#2563EB" : "#CBD5E1",
                borderWidth: corAtual === COR_FUNDO ? 2 : 1,
              },
            ]}
          >
            <Text style={styles.textoBorracha}>
              Borracha · voltar ao branco
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.secao}>
          <Text style={styles.rotulo}>SEU DESENHO · 16 × 16</Text>

          <View
            ref={gradeRef}
            collapsable={false}
            style={[
              styles.grade,
              {
                width: tamanhoPixel * TAMANHO,
                height: tamanhoPixel * TAMANHO,
              },
            ]}
          >
            {pixels.map((cor, index) => (
              <TouchableOpacity
                key={index}
                activeOpacity={1}
                accessibilityRole="button"
                accessibilityLabel={`Pintar linha ${Math.floor(index / TAMANHO) + 1}, coluna ${(index % TAMANHO) + 1}`}
                onPress={() => pintarPixel(index)}
                style={{
                  width: tamanhoPixel,
                  height: tamanhoPixel,
                  backgroundColor: cor,
                  borderWidth: 0.5,
                  borderColor: "#D1D5DB",
                }}
              />
            ))}
          </View>

          <Text style={styles.dica}>
            Toque em um quadrado para pintá-lo.
          </Text>
        </View>

        <View style={styles.botoes}>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={limpar}
            style={[styles.botao, styles.botaoLimpar]}
          >
            <Text style={styles.textoBotaoLimpar}>Limpar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            onPress={compartilhar}
            style={[styles.botao, styles.botaoCompartilhar]}
          >
            <Text style={styles.textoBotaoCompartilhar}>
              Exportar / compartilhar
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.estadoSalvamento}>
          {carregando
            ? "Carregando desenho..."
            : "Desenho salvo automaticamente"}
        </Text>

        <Text style={styles.rodape}>
          Feito com criatividade e React Native.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  conteudo: {
    flexGrow: 1,
    alignItems: "center",
    paddingTop: 32,
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
  titulo: {
    fontSize: 38,
    fontWeight: "900",
    color: "#111827",
    letterSpacing: -1,
  },
  subtitulo: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 5,
    marginBottom: 24,
    textAlign: "center",
  },
  secao: {
    alignItems: "center",
    marginBottom: 22,
  },
  rotulo: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: "#475569",
    marginBottom: 12,
    textAlign: "center",
  },
  paleta: {
    flexDirection: "row",
    flexWrap: "wrap",
    overflow: "hidden",
    borderRadius: 6,
  },
  corSelecionada: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 10,
  },
  botaoBorracha: {
    marginTop: 12,
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  textoBorracha: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "700",
  },
  grade: {
    flexDirection: "row",
    flexWrap: "wrap",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#94A3B8",
    backgroundColor: "#FFFFFF",
  },
  dica: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 10,
  },
  botoes: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    width: "100%",
    maxWidth: 400,
  },
  botao: {
    minHeight: 46,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  botaoLimpar: {
    backgroundColor: "#E2E8F0",
  },
  botaoCompartilhar: {
    backgroundColor: "#2563EB",
  },
  textoBotaoLimpar: {
    color: "#1E293B",
    fontSize: 13,
    fontWeight: "700",
  },
  textoBotaoCompartilhar: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  estadoSalvamento: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 20,
  },
  rodape: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 12,
  },
});
