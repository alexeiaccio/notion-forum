/* eslint-disable no-useless-escape */
/* eslint-disable max-len */
import {faker} from '@faker-js/faker';
import {Meta} from '@storybook/react/types-6-0';
import React, {useCallback} from 'react';

import {RichTextEditor, RichTextRenderer} from '.';

const longDescription = `# Прогноз проницаемости образцов горной породы по петрофизическим свойствам методами машинного обучения
Необходимо разработать методику для прогноза проницаемости образцов горной породы по их петрофизическим свойствам методами машинного обучения.
Входными признаками являются: 
1. Общая пористость образца (\$\\Phi\$) - это доля объёма порового пространства в общем объёме горного образца
2. Профиль пористости образца вдоль оси Z (\$\\phi_z\$) - локальная пористость горного образца замеренная вдоль оси Z, она показывает степень однородности породы по направлению оси Z.
Целевая функция:
Абсолютная проницаемость вдоль оси Z (\$k_z\$)- это величина, характеризующая способность горного образца пропускать жидкость или газ при перепаде давления, типичная размерность мД (миллидарси). Чем это значение это выше, тем лучше образец пропускает жидкость.
## Загрузка обучающей выборки и визуализация данных
Сначала, загрузим базу данных обучающей выборки.
\$\$T f = T \\left( \\sum_{k=1}^n \\alpha_k (v_k \\otimes w_k) \\right) = \\sum_{k=1}^n \\alpha_k T (v_k \\otimes w_k)\$\$
\`\`\`python
import numpy as np
import matplotlib.pyplot as plt
\`\`\`
Загрузка общей пористости образцов ($\Phi$, porosity):
\`\`\`python
porosity=np.genfromtxt('porosity.csv',invalid_raise=False,comments='#',delimiter=',')
print('Количество образцов в обучающей выборке: ',np.size(porosity))
\`\`\`
    Количество образцов в обучающей выборке:  100
Загрузка профиля пористости образца вдоль оси Z (\$\\phi_z\$, porosityProfile):
\`\`\`python
porosityProfile=np.genfromtxt('porosityProfile.csv',invalid_raise=False,comments='#',delimiter=',')
\`\`\`
Профиль пористости был замерен с интервалом 5 мкм.
Загрузка абсолютной проницаемости вдоль оси Z ($k_z$, permeabilityZ):
\`\`\`python
permeabilityZ=np.genfromtxt('permeabilityZ.csv',invalid_raise=False,comments='#',delimiter=',')
\`\`\`
### Теперь, визуализируем загруженные данные.
График проницаемость - пористость ($k_z$ - $\Phi$) с полулогарифмическим масштабом:
\`\`\`python
#plt.plot(porosity,permeabilityZ,'ob')
plt.semilogy(porosity,permeabilityZ,'ob')
plt.grid()
plt.xlabel('$\Phi$')
plt.ylabel('$k_z$ (мД)')
plt.show()
\`\`\`
![png](${faker.image.imageUrl()})
### График профиля пористости вдоль оси Z (интервал замеров 5 мкм) для первого образца:
\`\`\`python
Z = np.arange(len(porosityProfile[0,:])) * 5 # (мкм)
plt.plot(Z,porosityProfile[0,:])
plt.grid()
plt.xlabel('Расстояние по оси Z (мкм)')
plt.ylabel('$\phi_z$')
plt.show()
\`\`\`
![png](${faker.image.imageUrl()})
Профиль пористости вдоль оси Z (интервал замеров 5 мкм) для всех образцов на одном графике:
\`\`\`python
for i in np.arange(len(porosityProfile[:,0])):
    plt.plot(Z,porosityProfile[i,:])
plt.grid()
plt.xlabel('Расстояние по оси Z (мкм)')
plt.ylabel('$\phi_z$')
plt.show()
\`\`\`
![png](${faker.image.imageUrl()})
## Простейшая зависимость проницаемости от общей пористости
График $k_z$ - $\Phi$ показывает, что в первом приближении можно построить зависимость проницаемости от пористости образца используя элементарную регрессионную модель - экспоненциальную функцию $k_z=c\Phi^m$, коэффициенты которой определяются с помощью метода наименьших квадратов:
\`\`\`python
popt=np.polyfit(np.log(porosity[permeabilityZ>1]), np.log(permeabilityZ[permeabilityZ>1]), 1)
c=np.exp(popt[1])
m=popt[0]
\`\`\`
Теперь построим тот же график $k_z$ - $\Phi$ и добавим нашу регрессионную модель $k_z=c\Phi^m$:  
\`\`\`python
plt.semilogy(porosity, permeabilityZ, 'bo', label="обучающая выборка")
plt.semilogy(porosity, c*porosity**m, '.r', label="прогноз по обучающей выборке")
plt.legend()
plt.grid()
plt.xlabel('$\Phi$')
plt.ylabel('$k_z$ (мД)')
plt.show()
\`\`\`
![png](${faker.image.imageUrl()})
Рассчитаем среднюю относительную ошибку прогноза по обучающей выборке по формуле
\$\$\\epsilon_\\mathit{rel}=\\frac{1}{N}\\sum_i^N\\left|\\frac{k_z^\\mathit{true}-k_z^\\mathit{model}}{k_z^\\mathit{true}}\\right|\$\$
Чтобы избежать деления на ноль, возьмем только те образцы, проницаемость которых больше маленького значения, например больше 0.001 мД:
\`\`\`python
relError=np.mean(abs(permeabilityZ[permeabilityZ>1e-3]-c*porosity[permeabilityZ>1e-3]**m)/permeabilityZ[permeabilityZ>1e-3])
print('Средняя относительная ошибка прогноза по обучающей выборке:', relError)
\`\`\`
Средняя относительная ошибка прогноза по обучающей выборке: 1.2297197555599617
В заключение проанализируем результаты прогноза. Последний график показывает, что регрессионная модель $k_z=c\Phi^m$ неплохо работает для проницаемости больше 100 мД, но при меньшей проницаемости данная модель не достоверна, что в итоге приводит к средней относительной ошибке прогноза более 1.
## Задача
Участникам хакатона предлагается разработать более совершенную методику прогноза проницаемости методами машинного обучения, используя общую пористость и профиль пористости образцов. Причем профиль пористости можно использовать как напрямую, так и косвенно, рассчитав статистику профиля (среднеквадратичное отклонение, максимальное/минимальное значение, симметрия и т. д.).
Решение нужно будет записать в эту тетрадку (ipynb файл). Также нужно будет создать файл (test_permeability.csv), содержащую прогноз проницаемости по тестовой выборке.
## Загрузка тестовой выборки
\`\`\`python
test_porosity=np.genfromtxt('test_porosity.csv',invalid_raise=False,comments='#',delimiter=',')
print('Количество образцов в тестовой выборке: ',np.size(test_porosity))
test_porosityProfile=np.genfromtxt('test_porosityProfile.csv',invalid_raise=False,comments='#',delimiter=',')
\`\`\`
    Количество образцов в тестовой выборке:  100
Визуализация тестовой выборки:
\`\`\`python
plt.semilogy(porosity,'go', label="тестовая выборка")
plt.legend()
plt.grid()
plt.ylabel('$\Phi$')
plt.xlabel('Номер образца')
plt.show()

test_Z = np.arange(len(test_porosityProfile[0,:])) * 5 # (мкм)
for i in np.arange(len(test_porosityProfile[:,0])):
    plt.plot(Z,test_porosityProfile[i,:])
plt.grid()
plt.xlabel('Расстояние по оси Z (мкм)')
plt.ylabel('$\phi_z$')
plt.show()
\`\`\`
![png](${faker.image.imageUrl()})
`;

export const Basic: React.FC<{}> = () => {
  return <RichTextEditor placeholder="Введите текст" isRichText />;
};

export const MarkdownDefaultValue: React.FC<{}> = () => {
  const handleChange = useCallback((state: string) => {
    // eslint-disable-next-line no-console
    console.log(state);
  }, []);

  const loadImage = (file: File) => {
    return {src: file.name, altText: file.name};
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        padding: '2rem'
      }}
    >
      <RichTextEditor
        defaultMarkdownValue={longDescription}
        isRichText
        onImageUpload={loadImage}
        onChange={handleChange}
      />
    </div>
  );
};

export const StaticRender: React.FC<{}> = () => {
  return <RichTextRenderer defaultMarkdownValue={longDescription} isRichText />;
};

export const EmptyStatic: React.FC<{}> = () => {
  return <RichTextRenderer placeholder="No content" isRichText />;
};

export default {
  title: 'UI Kit/RichTextEditor',
  component: RichTextEditor,
  parameters: {
    jsx: {
      displayName: () => 'RichTextEditor'
    }
  }
} as Meta;
