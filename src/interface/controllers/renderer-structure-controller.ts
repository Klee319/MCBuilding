/**
 * Renderer Structure Controller
 *
 * Handles structure rendering requests and user interactions for the 3D viewer.
 * Coordinates between usecases and manages render state.
 */

import type {
  LoadStructureUsecase,
} from '../../usecase/renderer/load-structure.js';
import type {
  RenderStructureUsecase,
} from '../../usecase/renderer/render-structure.js';
import type {
  UpdateCameraUsecase,
  CameraAction,
} from '../../usecase/renderer/update-camera.js';
import type {
  SelectBlockUsecase,
  SelectBlockOutput,
} from '../../usecase/renderer/select-block.js';
import type { StructureFormat, Result } from '../../usecase/ports/renderer/nbt-parser-port.js';
import type { CanvasElement } from '../../usecase/ports/renderer/webgl-renderer-port.js';
import type { Structure } from '../../domain/renderer/structure.js';
import { RenderState } from '../../domain/renderer/render-state.js';
import type { PortError } from '../../usecase/ports/types.js';

/**
 * RendererStructureController
 *
 * Controller for the 3D Structure Renderer.
 * Coordinates loading, rendering, camera updates, and block selection.
 */
export class RendererStructureController {
  private readonly loadStructureUsecase: LoadStructureUsecase;
  private readonly renderStructureUsecase: RenderStructureUsecase;
  private readonly updateCameraUsecase: UpdateCameraUsecase;
  private readonly selectBlockUsecase: SelectBlockUsecase;

  private renderState: RenderState;
  private currentStructure: Structure | null = null;

  /**
   * Creates a new RendererStructureController
   *
   * @param loadStructure - UseCase for loading structure files
   * @param renderStructure - UseCase for rendering structures
   * @param updateCamera - UseCase for updating camera state
   * @param selectBlock - UseCase for selecting blocks via raycast
   */
  constructor(
    loadStructure: LoadStructureUsecase,
    renderStructure: RenderStructureUsecase,
    updateCamera: UpdateCameraUsecase,
    selectBlock: SelectBlockUsecase
  ) {
    this.loadStructureUsecase = loadStructure;
    this.renderStructureUsecase = renderStructure;
    this.updateCameraUsecase = updateCamera;
    this.selectBlockUsecase = selectBlock;
    this.renderState = RenderState.default();
  }

  /**
   * Loads a structure from file data
   *
   * @param file - File or ArrayBuffer containing structure data
   * @param format - Structure file format
   * @returns Result containing loaded Structure or error
   */
  async load(
    file: File | ArrayBuffer,
    format: StructureFormat
  ): Promise<Result<Structure, PortError>> {
    const result = await this.loadStructureUsecase.execute({
      data: file,
      format,
    });

    if (result.success) {
      this.currentStructure = result.value.structure;
      return {
        success: true,
        value: result.value.structure,
      };
    }

    return result;
  }

  /**
   * Starts rendering a structure to the canvas
   *
   * @param structure - Structure to render
   * @param canvas - Canvas element to render to
   * @returns Result indicating success or error
   */
  async startRendering(
    structure: Structure,
    canvas: CanvasElement
  ): Promise<Result<void, PortError>> {
    this.currentStructure = structure;

    const result = await this.renderStructureUsecase.execute({
      structure,
      state: this.renderState,
      canvas,
    });

    return result;
  }

  /**
   * Handles a camera action and updates render state
   *
   * @param action - Camera action to apply
   * @returns Updated render state
   */
  handleCameraAction(action: CameraAction): RenderState {
    const newState = this.updateCameraUsecase.execute({
      currentState: this.renderState,
      action,
    });

    this.renderState = newState;
    return this.renderState;
  }

  /**
   * Handles block selection at screen coordinates
   *
   * @param screenX - X coordinate in screen space
   * @param screenY - Y coordinate in screen space
   * @returns Selected block and face, or null values if no hit
   */
  handleBlockSelect(screenX: number, screenY: number): SelectBlockOutput {
    if (!this.currentStructure) {
      return { block: null, face: null };
    }

    const result = this.selectBlockUsecase.execute({
      screenX,
      screenY,
      structure: this.currentStructure,
    });

    // Update render state with selected block position
    if (result.block) {
      this.renderState = this.renderState.withSelectedBlock(result.block.position);
    }

    return result;
  }

  /**
   * Gets the current render state
   *
   * @returns Current RenderState
   */
  getRenderState(): RenderState {
    return this.renderState;
  }

  /**
   * Disposes of resources
   *
   * Should be called when the controller is no longer needed.
   */
  dispose(): void {
    this.renderStructureUsecase.dispose();
  }
}
